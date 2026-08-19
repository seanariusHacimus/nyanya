"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { specialistProfiles, documents, notifications, user } from "@/db/schema";
import {
  saveDocument,
  removeDocument,
  isAllowedMime,
  MAX_FILE_BYTES,
} from "@/lib/storage";
import {
  stepByKey,
} from "@/content/verification-steps";
import { detectMime, matchesDeclaredMime } from "@/lib/file-type";

/* ------------------------- вспомогательное ------------------------- */

async function requireSpecialist() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "unauthorized" as const };
  if (session.user.role !== "specialist") return { error: "forbidden" as const };
  return { session };
}

/** Анкета текущего специалиста; создаётся при первом обращении. */
async function ensureProfile(userId: string, fallbackName: string) {
  const existing = await db
    .select()
    .from(specialistProfiles)
    .where(eq(specialistProfiles.userId, userId))
    .limit(1);
  if (existing[0]) return existing[0];

  const created = await db
    .insert(specialistProfiles)
    .values({
      userId,
      category: "nanny",
      fullName: fallbackName || "Без имени",
      status: "draft",
    })
    .returning();
  return created[0];
}

/* --------------------------- анкета (§8) --------------------------- */

const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  category: z.enum(["nanny", "caregiver", "tutor", "driver"]),
  birthDate: z.string().trim().max(20).optional().or(z.literal("")),
  districtId: z.coerce.number().int().positive().optional().nullable(),
  experienceYears: z.coerce.number().int().min(0).max(60),
  education: z.string().trim().max(300).optional().or(z.literal("")),
  languages: z.array(z.string().trim().max(40)).max(10),
  englishLevel: z.enum(["none", "basic", "fluent"]),
  priceAmount: z.coerce.number().int().min(0).max(100_000_000),
  priceUnit: z.enum(["hour", "day", "month"]),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  hasCar: z.boolean(),
  liveIn: z.boolean(),
  nightAvailable: z.boolean(),
  newbornExp: z.boolean(),
});

export async function saveSpecialistProfile(input: unknown) {
  const guard = await requireSpecialist();
  if ("error" in guard) return { ok: false as const, error: guard.error };

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "invalid" as const };

  const profile = await ensureProfile(
    guard.session.user.id,
    guard.session.user.name
  );
  const d = parsed.data;

  await db
    .update(specialistProfiles)
    .set({
      fullName: d.fullName,
      category: d.category,
      birthDate: d.birthDate || null,
      districtId: d.districtId ?? null,
      experienceYears: d.experienceYears,
      education: d.education || null,
      languages: d.languages,
      englishLevel: d.englishLevel,
      priceAmount: d.priceAmount,
      priceUnit: d.priceUnit,
      description: d.description || null,
      hasCar: d.hasCar,
      liveIn: d.liveIn,
      nightAvailable: d.nightAvailable,
      newbornExp: d.newbornExp,
      updatedAt: new Date(),
    })
    .where(eq(specialistProfiles.id, profile.id));

  revalidatePath("/specialist");
  return { ok: true as const };
}

/* --------------------- документы верификации ---------------------- */

export async function uploadVerificationDocument(formData: FormData) {
  const guard = await requireSpecialist();
  if ("error" in guard) return { ok: false as const, error: guard.error };

  const stepKey = String(formData.get("step") ?? "");
  const step = stepByKey.get(stepKey as never);
  if (!step) return { ok: false as const, error: "invalid_step" as const };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { ok: false as const, error: "no_file" as const };
  if (file.size > MAX_FILE_BYTES)
    return { ok: false as const, error: "too_large" as const };
  if (!isAllowedMime(file.type))
    return { ok: false as const, error: "bad_type" as const };

  const profile = await ensureProfile(
    guard.session.user.id,
    guard.session.user.name
  );

  const buffer = Buffer.from(await file.arrayBuffer());

  // Заявленный браузером тип не является доказательством: документ потом
  // отдаётся с этим же mime, поэтому сверяем его с сигнатурой файла.
  const detected = detectMime(buffer);
  if (!detected || !matchesDeclaredMime(detected, file.type))
    return { ok: false as const, error: "bad_type" as const };

  const key = await saveDocument(profile.id, {
    buffer,
    fileName: file.name,
    // сохраняем распознанный тип, а не присланный
    mimeType: detected,
  });

  // предыдущий файл этого шага заменяется
  const previous = await db
    .select({ id: documents.id, fileKey: documents.fileKey })
    .from(documents)
    .where(
      and(eq(documents.specialistId, profile.id), eq(documents.type, step.key))
    )
    .limit(1);

  if (previous[0]) {
    await db
      .update(documents)
      .set({
        fileKey: key,
        fileName: file.name,
        mimeType: detected,
        fileSize: file.size,
        status: "pending",
        reviewNote: null,
        reviewedBy: null,
        reviewedAt: null,
        createdAt: new Date(),
      })
      .where(eq(documents.id, previous[0].id));
    await removeDocument(previous[0].fileKey);
  } else {
    await db.insert(documents).values({
      specialistId: profile.id,
      type: step.key,
      fileKey: key,
      fileName: file.name,
      mimeType: detected,
      fileSize: file.size,
      status: "pending",
    });
  }

  // Новый файл не проверен, поэтому полный комплект больше не собран (D27).
  // Опубликованная анкета уходит на повторную модерацию — иначе замена
  // паспорта после публикации обходила бы проверку целиком.
  const wasActive = profile.status === "active";
  await db
    .update(specialistProfiles)
    .set({
      verificationLevel: "unverified",
      ...(wasActive
        ? { status: "pending_review" as const, submittedAt: new Date() }
        : {}),
      // фото профиля сразу становится фотографией анкеты
      ...(step.key === "profile_photo"
        ? { photoKey: `/api/documents/${key}` }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(specialistProfiles.id, profile.id));

  if (wasActive) {
    await db.insert(notifications).values({
      userId: guard.session.user.id,
      type: "verification_status",
      title: "Анкета отправлена на повторную проверку",
      body: `Вы заменили документ «${step.title}». Анкета вернётся в каталог после проверки модератором.`,
    });
    revalidatePath("/catalog");
    if (profile.slug) revalidatePath(`/specialists/${profile.slug}`);
  }

  revalidatePath("/specialist");
  // возвращаем данные, чтобы интерфейс обновился мгновенно, без перезагрузки
  return {
    ok: true as const,
    step: step.key,
    fileKey: key,
    fileName: file.name,
  };
}

export async function deleteVerificationDocument(input: unknown) {
  const guard = await requireSpecialist();
  if ("error" in guard) return { ok: false as const, error: guard.error };

  const parsed = z.object({ step: z.string() }).safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "invalid" as const };

  const profile = await ensureProfile(
    guard.session.user.id,
    guard.session.user.name
  );

  const rows = await db
    .select({ id: documents.id, fileKey: documents.fileKey })
    .from(documents)
    .where(
      and(
        eq(documents.specialistId, profile.id),
        eq(documents.type, parsed.data.step as never)
      )
    )
    .limit(1);

  if (rows[0]) {
    await db.delete(documents).where(eq(documents.id, rows[0].id));
    await removeDocument(rows[0].fileKey);
    if (parsed.data.step === "profile_photo") {
      await db
        .update(specialistProfiles)
        .set({ photoKey: null, updatedAt: new Date() })
        .where(eq(specialistProfiles.id, profile.id));
    }
  }

  revalidatePath("/specialist");
  return { ok: true as const };
}

/* ------------------- отправка на модерацию (§8.9) ------------------ */

export async function submitForModeration() {
  const guard = await requireSpecialist();
  if ("error" in guard) return { ok: false as const, error: guard.error };

  const profile = await ensureProfile(
    guard.session.user.id,
    guard.session.user.name
  );

  // обязательные поля анкеты
  const missingFields =
    !profile.fullName ||
    profile.fullName === "Без имени" ||
    !profile.birthDate ||
    !profile.districtId ||
    !profile.description ||
    profile.priceAmount <= 0;
  if (missingFields)
    return { ok: false as const, error: "profile_incomplete" as const };

  // загружены все ОБЯЗАТЕЛЬНЫЕ шаги категории; рекомендуемые нужны только
  // для «Премиум-проверен» и отправку не блокируют
  const uploaded = await db
    .select({ type: documents.type })
    .from(documents)
    .where(eq(documents.specialistId, profile.id));
  /**
   * Для отправки достаточно фотографии — того же минимума, что и для
   * публикации. Справки собирают неделями, и держать человека вне каталога,
   * пока он бегает по диспансерам, значит терять и его, и семьи. Остальные
   * документы он догрузит потом: с ними анкета поднимется до «Премиум-проверен».
   */
  const uploadedSet = new Set(uploaded.map((d) => d.type));
  if (!uploadedSet.has("profile_photo"))
    return {
      ok: false as const,
      error: "documents_missing" as const,
      missingSteps: ["profile_photo"],
    };

  await db
    .update(specialistProfiles)
    .set({
      status: "pending_review",
      moderationNote: null,
      submittedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(specialistProfiles.id, profile.id));

  await db.insert(notifications).values({
    userId: guard.session.user.id,
    type: "profile_submitted",
    title: "Анкета отправлена на проверку",
    body: "Модератор проверит документы и анкету — обычно это занимает 1–2 рабочих дня. Мы сообщим, когда анкета будет опубликована.",
  });

  // уведомляем администраторов, чтобы очередь модерации не простаивала
  const admins = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.role, "admin"));
  if (admins.length > 0) {
    await db.insert(notifications).values(
      admins.map((a) => ({
        userId: a.id,
        type: "system" as const,
        title: "Новая анкета на модерации",
        body: `${profile.fullName} отправил(а) анкету и документы на проверку.`,
      }))
    );
  }

  revalidatePath("/specialist");
  return { ok: true as const };
}
