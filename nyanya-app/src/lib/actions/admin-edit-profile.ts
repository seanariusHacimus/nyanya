"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { documents, specialistProfiles } from "@/db/schema";
import { user } from "@/db/auth-schema";
import {
  deriveVerificationLevel,
  summarizeDocuments,
  type DocumentStatus,
} from "@/lib/verification";

/**
 * Правка анкеты администратором.
 *
 * Опечатку в имени, лишний ноль в цене, возраст, попавший в поле опыта, —
 * всё это находят уже после публикации, и заставлять человека снимать анкету
 * ради запятой бессмысленно. Поэтому правка НЕ меняет статус: опубликованная
 * остаётся опубликованной, семья ничего не теряет.
 *
 * Два места, где всё же приходится думать, а не просто писать в базу:
 *
 * 1. **Категория.** От неё зависит перечень документов: водителю нужно
 *    удостоверение, остальным нет. Смена категории меняет и то, что считается
 *    полным комплектом, поэтому уровень пересчитывается — иначе бывшая няня
 *    осталась бы «Премиум-проверенным» водителем без прав.
 *
 * 2. **Адрес анкеты (slug).** Он не меняется вслед за именем намеренно:
 *    ссылку могли сохранить или отправить, и менять её из-за исправленной
 *    буквы значит ломать её у всех, кто уже держит.
 */

const schema = z.object({
  profileId: z.string().uuid(),
  fullName: z.string().trim().min(2).max(120),
  category: z.enum(["nanny", "caregiver", "tutor", "driver"]),
  birthDate: z.string().trim().min(4),
  districtId: z.number().int().positive(),
  priceAmount: z.number().int().positive(),
  priceUnit: z.enum(["hour", "day", "month"]),
  experienceYears: z.number().int().min(0).max(60),
  education: z.string().trim().max(300),
  description: z.string().trim().max(4000),
  englishLevel: z.enum(["none", "basic", "fluent"]),
  languages: z.array(z.string().trim().max(40)).max(10),
  hasCar: z.boolean(),
  liveIn: z.boolean(),
  nightAvailable: z.boolean(),
  newbornExp: z.boolean(),
  /** Телефон живёт у пользователя — его видит семья, открывшая контакты. */
  phone: z.string().trim().min(7).max(20),
});

export type AdminEditResult =
  | { ok: true; levelChanged: boolean }
  | { ok: false; error: string; detail?: string };

export async function adminUpdateProfile(
  input: unknown
): Promise<AdminEditResult> {
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

  const [current] = await db
    .select({
      id: specialistProfiles.id,
      userId: specialistProfiles.userId,
      category: specialistProfiles.category,
      verificationLevel: specialistProfiles.verificationLevel,
      slug: specialistProfiles.slug,
    })
    .from(specialistProfiles)
    .where(eq(specialistProfiles.id, d.profileId))
    .limit(1);
  if (!current) return { ok: false, error: "not_found" };

  /**
   * Опыт не может превышать возраст минус шестнадцать. Проверка появилась
   * после живого случая: у человека 34 лет в анкете стояло «опыт 35 лет» —
   * в поле опыта попал возраст, и семья видела нелепицу в каталоге.
   */
  const born = new Date(d.birthDate);
  if (!Number.isNaN(born.getTime())) {
    const age = Math.floor(
      (Date.now() - born.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );
    if (d.experienceYears > Math.max(0, age - 16)) {
      return {
        ok: false,
        error: "experience_too_high",
        detail: `При возрасте ${age} лет опыт не может быть больше ${Math.max(0, age - 16)}.`,
      };
    }
  }

  // категория меняет перечень документов — уровень пересчитываем по новой
  const categoryChanged = current.category !== d.category;
  let nextLevel = current.verificationLevel;
  if (categoryChanged) {
    const rows = await db
      .select({ type: documents.type, status: documents.status })
      .from(documents)
      .where(eq(documents.specialistId, current.id));
    nextLevel = deriveVerificationLevel(
      summarizeDocuments(
        rows.map((r) => ({ type: r.type, status: r.status as DocumentStatus })),
        d.category
      )
    );
  }

  await db.transaction(async (tx) => {
    await tx
      .update(specialistProfiles)
      .set({
        fullName: d.fullName,
        category: d.category,
        birthDate: d.birthDate,
        districtId: d.districtId,
        priceAmount: d.priceAmount,
        priceUnit: d.priceUnit,
        experienceYears: d.experienceYears,
        education: d.education,
        description: d.description,
        englishLevel: d.englishLevel,
        languages: d.languages,
        hasCar: d.hasCar,
        liveIn: d.liveIn,
        nightAvailable: d.nightAvailable,
        newbornExp: d.newbornExp,
        verificationLevel: nextLevel,
        // статус НЕ трогаем: правка опечатки не должна убирать человека из каталога
        updatedAt: new Date(),
      })
      .where(eq(specialistProfiles.id, current.id));

    await tx
      .update(user)
      .set({ name: d.fullName, phone: d.phone, updatedAt: new Date() })
      .where(eq(user.id, current.userId));
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/profiles/${current.id}`);
  revalidatePath("/catalog");
  if (current.slug) revalidatePath(`/specialists/${current.slug}`);

  return { ok: true, levelChanged: nextLevel !== current.verificationLevel };
}
