"use server";

import crypto from "node:crypto";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { hashPassword } from "better-auth/crypto";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { specialistProfiles } from "@/db/schema";
import { user, account } from "@/db/auth-schema";

/**
 * Создание анкеты специалиста администратором.
 *
 * Ключевое ограничение схемы: `specialist_profiles.user_id` объявлен
 * `.unique()` — одна анкета на одного пользователя. Значит «админ добавляет
 * анкеты через свой профиль» невозможно буквально: вторая вставка с id
 * администратора упала бы ошибкой базы. Поэтому на каждую анкету заводится
 * отдельный аккаунт специалиста — обычный, ничем не хуже созданного вручную.
 * Человек получает почту и пароль и работает в нём как в своём: меняет анкету,
 * догружает документы, видит уведомления.
 *
 * Почта требуется настоящая (решение владельца): именно по ней человек войдёт.
 * Кода подтверждения при этом не спрашиваем — адрес вводит администратор,
 * который его и проверил. `emailVerified` ставим сразу, иначе аккаунт выглядел
 * бы недоделанным.
 *
 * Анкета создаётся ЧЕРНОВИКОМ. Публикация — отдельное осознанное действие
 * модератора: иначе в каталог попадали бы люди, чью фотографию никто не видел.
 */

const schema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().min(7).max(20),
  password: z.string().min(8).max(200),
  category: z.enum(["nanny", "caregiver", "tutor", "driver"]),
  birthDate: z.string().trim().min(4),
  districtId: z.number().int().positive(),
  priceAmount: z.number().int().positive(),
  priceUnit: z.enum(["hour", "day", "month"]),
  description: z.string().trim().max(4000).optional().default(""),
  experienceYears: z.number().int().min(0).max(60).optional().default(0),
  education: z.string().trim().max(300).optional().default(""),
});

export type AdminCreateResult =
  | { ok: true; profileId: string }
  | { ok: false; error: string; detail?: string };

export async function adminCreateSpecialist(
  input: unknown
): Promise<AdminCreateResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "unauthorized" };
  if (session.user.role !== "admin") return { ok: false, error: "forbidden" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid",
      detail: parsed.error.issues[0]?.message,
    };
  }
  const d = parsed.data;

  // Занятую почту ловим заранее и объясняем словами: уникальный индекс дал бы
  // пятисотку, из которой администратор ничего бы не понял.
  const [existing] = await db
    .select({ id: user.id, role: user.role })
    .from(user)
    .where(eq(user.email, d.email))
    .limit(1);
  if (existing) {
    return {
      ok: false,
      error: "email_taken",
      detail:
        existing.role === "specialist"
          ? "Специалист с такой почтой уже есть — найдите его в списке анкет."
          : "Эта почта занята другим аккаунтом.",
    };
  }

  const userId = crypto.randomUUID();
  const passwordHash = await hashPassword(d.password);

  /**
   * Пользователь, пароль и анкета создаются одной транзакцией. Иначе при сбое
   * на середине остался бы аккаунт без анкеты или, хуже, анкета без владельца:
   * контакты семье отдаются джойном по `user`, и такая анкета молча пропала бы
   * из каталога.
   */
  const profileId = await db.transaction(async (tx) => {
    await tx.insert(user).values({
      id: userId,
      name: d.fullName,
      email: d.email,
      emailVerified: true,
      role: "specialist",
      phone: d.phone,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await tx.insert(account).values({
      id: crypto.randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const [profile] = await tx
      .insert(specialistProfiles)
      .values({
        userId,
        fullName: d.fullName,
        category: d.category,
        birthDate: d.birthDate,
        districtId: d.districtId,
        priceAmount: d.priceAmount,
        priceUnit: d.priceUnit,
        description: d.description,
        experienceYears: d.experienceYears,
        education: d.education,
        // slug появляется только при публикации — до неё адреса у анкеты нет
        status: "draft",
        verificationLevel: "unverified",
      })
      .returning({ id: specialistProfiles.id });

    return profile.id;
  });

  revalidatePath("/admin");
  return { ok: true, profileId };
}
