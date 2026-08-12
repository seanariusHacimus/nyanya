"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { documents, notifications, specialistProfiles } from "@/db/schema";
import { stepByKey } from "@/content/verification-steps";
import {
  MAX_FILE_BYTES,
  isAllowedMime,
  removeDocument,
  saveDocument,
} from "@/lib/storage";
import { detectMime, matchesDeclaredMime } from "@/lib/file-type";

/**
 * Загрузка документа администратором за специалиста.
 *
 * Нужна, потому что анкеты заводит администратор: человек приносит справки
 * на бумаге или присылает в мессенджер, и кто-то должен положить их в анкету.
 * Специалист потом может заменить любой файл сам — это те же строки в тех же
 * таблицах, никакого отдельного «админского» хранилища нет.
 *
 * Отличие от загрузки самим специалистом ровно одно: документ, положенный
 * администратором, сразу помечается принятым. Модератор его и так видит —
 * он сам его и загрузил, требовать от него второго нажатия «Принять» было бы
 * бессмысленным обрядом.
 */

type Result =
  | { ok: true; step: string; fileKey: string; fileName: string }
  | { ok: false; error: string };

export async function adminUploadDocument(formData: FormData): Promise<Result> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "unauthorized" };
  if (session.user.role !== "admin") return { ok: false, error: "forbidden" };

  const profileId = String(formData.get("profileId") ?? "");
  const stepKey = String(formData.get("step") ?? "");
  const step = stepByKey.get(stepKey as never);
  if (!step) return { ok: false, error: "invalid_step" };

  const [profile] = await db
    .select({
      id: specialistProfiles.id,
      userId: specialistProfiles.userId,
      status: specialistProfiles.status,
      slug: specialistProfiles.slug,
    })
    .from(specialistProfiles)
    .where(eq(specialistProfiles.id, profileId))
    .limit(1);
  if (!profile) return { ok: false, error: "not_found" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { ok: false, error: "no_file" };
  if (file.size > MAX_FILE_BYTES) return { ok: false, error: "too_large" };
  if (!isAllowedMime(file.type)) return { ok: false, error: "bad_type" };

  const buffer = Buffer.from(await file.arrayBuffer());

  // заявленный браузером тип не доказательство: файл потом отдаётся с этим же
  // mime, поэтому сверяем с сигнатурой
  const detected = detectMime(buffer);
  if (!detected || !matchesDeclaredMime(detected, file.type))
    return { ok: false, error: "bad_type" };

  const key = await saveDocument(profile.id, {
    buffer,
    fileName: file.name,
    mimeType: detected,
  });

  const [previous] = await db
    .select({ id: documents.id, fileKey: documents.fileKey })
    .from(documents)
    .where(
      and(eq(documents.specialistId, profile.id), eq(documents.type, step.key))
    )
    .limit(1);

  if (previous) {
    await db
      .update(documents)
      .set({
        fileKey: key,
        fileName: file.name,
        mimeType: detected,
        fileSize: file.size,
        status: "approved",
        reviewNote: null,
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
        createdAt: new Date(),
      })
      .where(eq(documents.id, previous.id));
    await removeDocument(previous.fileKey);
  } else {
    await db.insert(documents).values({
      specialistId: profile.id,
      type: step.key,
      fileKey: key,
      fileName: file.name,
      mimeType: detected,
      fileSize: file.size,
      status: "approved",
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
    });
  }

  await db
    .update(specialistProfiles)
    .set({
      // фотография сразу становится фотографией анкеты
      ...(step.key === "profile_photo"
        ? { photoKey: `/api/documents/${key}` }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(specialistProfiles.id, profile.id));

  await db.insert(notifications).values({
    userId: profile.userId,
    type: "verification_status",
    title: `Документ «${step.title}» добавлен`,
    body: "Документ загрузил администратор. Если он неверный — замените его в кабинете.",
  });

  revalidatePath("/admin");
  revalidatePath("/specialist");
  if (profile.slug) revalidatePath(`/specialists/${profile.slug}`);
  return { ok: true, step: step.key, fileKey: key, fileName: file.name };
}

/**
 * Удаление документа администратором.
 *
 * Отдельно от загрузки: ошибиться файлом легко, а специалист исправить чужую
 * ошибку не всегда сможет — у него может не быть доступа к компьютеру.
 */
export async function adminDeleteDocument(input: {
  profileId: string;
  step: string;
}): Promise<{ ok: boolean; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "unauthorized" };
  if (session.user.role !== "admin") return { ok: false, error: "forbidden" };

  const step = stepByKey.get(input.step as never);
  if (!step) return { ok: false, error: "invalid_step" };

  const [row] = await db
    .select({ id: documents.id, fileKey: documents.fileKey })
    .from(documents)
    .where(
      and(
        eq(documents.specialistId, input.profileId),
        eq(documents.type, step.key)
      )
    )
    .limit(1);
  if (!row) return { ok: true };

  await db.delete(documents).where(eq(documents.id, row.id));
  await removeDocument(row.fileKey);

  if (step.key === "profile_photo") {
    await db
      .update(specialistProfiles)
      .set({ photoKey: null, updatedAt: new Date() })
      .where(eq(specialistProfiles.id, input.profileId));
  }

  revalidatePath("/admin");
  revalidatePath("/specialist");
  return { ok: true };
}
