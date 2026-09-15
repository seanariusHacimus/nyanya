"use server";

import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { notifications, reviews, specialistProfiles, user } from "@/db/schema";
import { recalcRating } from "@/lib/rating";
import { checkReviewEligibility } from "@/lib/review-eligibility";
import type { ReviewDenial } from "@/lib/review-policy";

/**
 * Отзывы о специалисте.
 *
 * Кто может оставить отзыв: только тот, кто **открыл контакты** этого
 * специалиста, — это единственный след взаимодействия, который у нас есть. Но
 * открытие бесплатное, поэтому поверх него действуют правила
 * `lib/review-policy.ts` (возраст аккаунта, возраст открытия, лимит новых
 * отзывов в сутки), а каждый новый или изменённый отзыв получает статус
 * `pending` и семьям не виден, пока модератор не опубликует его в
 * `/admin/reviews` (решения владельца, 2026-09-16).
 *
 * Один отзыв на пару «семья — специалист» держит база — уникальный индекс
 * `uniq_review_specialist_parent`; повторная отправка правит ту же строку.
 * Прежний «найти, потом вставить» без транзакции пропускал дубли: восемь
 * одновременных отправок давали восемь отзывов и восемь голосов в среднем.
 */

const schema = z.object({
  slug: z.string().trim().min(1).max(120),
  rating: z.number().int().min(1).max(5),
  text: z.string().trim().max(2000).optional().default(""),
});

export type ReviewResult =
  | { ok: true; replaced: boolean }
  | {
      ok: false;
      error: "unauthorized" | "invalid" | "not_found" | "busy" | ReviewDenial;
      /** для отказов, которые пройдут со временем: через сколько секунд */
      retryAfterSec?: number | null;
    };

export async function createReview(input: unknown): Promise<ReviewResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "unauthorized" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { slug, rating, text } = parsed.data;
  const userId = session.user.id;

  // форма есть только на опубликованной анкете — и действие, как сетевой
  // endpoint, не принимает отзыв о снятой или неопубликованной
  const [profile] = await db
    .select({
      id: specialistProfiles.id,
      userId: specialistProfiles.userId,
      fullName: specialistProfiles.fullName,
    })
    .from(specialistProfiles)
    .where(
      and(eq(specialistProfiles.slug, slug), eq(specialistProfiles.status, "active"))
    )
    .limit(1);
  if (!profile) return { ok: false, error: "not_found" };

  const outcome = await db.transaction(async (tx) => {
    // один отзыв аккаунта за раз: иначе одновременные отправки о разных
    // специалистах видели бы одно и то же число новых отзывов и проходили
    // мимо суточного лимита. Не ждём — ожидающая транзакция держала бы
    // соединение из пула (см. unlock-contacts.ts); браузер шлёт действия
    // одного клиента по очереди, так что занято бывает только у скрипта
    const [lock] = await tx.execute<{ locked: boolean }>(
      sql`select pg_try_advisory_xact_lock(hashtextextended(${`review:${userId}`}, 0)) as locked`
    );
    if (!lock?.locked) return { kind: "busy" as const };

    const { decision } = await checkReviewEligibility(tx, {
      userId,
      profileId: profile.id,
      profileOwnerId: profile.userId,
      lockOwnReview: true,
    });
    if (!decision.allowed) {
      return {
        kind: "denied" as const,
        reason: decision.reason,
        retryAfterSec: decision.retryAfterSec,
      };
    }

    const saved = await tx
      .insert(reviews)
      .values({
        specialistId: profile.id,
        authorParentId: userId,
        rating,
        text: text || null,
        status: "pending",
      })
      .onConflictDoUpdate({
        target: [reviews.specialistId, reviews.authorParentId],
        // правка опубликованного отзыва снова отправляет его на проверку:
        // иначе одобренный текст можно было бы заменить чем угодно
        set: { rating, text: text || null, status: "pending", updatedAt: sql`now()` },
        // скрытый модератором не правится (строка прочитана FOR UPDATE выше,
        // условие — последняя страховка)
        setWhere: sql`${reviews.status} <> 'hidden'`,
      })
      .returning({ id: reviews.id });
    if (saved.length === 0) {
      return { kind: "denied" as const, reason: "hidden_by_moderator" as const, retryAfterSec: null };
    }

    // прежняя опубликованная версия ушла на проверку — среднее должно её забыть
    await recalcRating(tx, profile.id);

    // администраторам — когда отзыв попадает в очередь, а не на каждую правку
    // того, что уже в ней: семья, пять раз поправившая текст, не должна
    // присылать пять уведомлений
    if (decision.ownStatus !== "pending") {
      const admins = await tx
        .select({ id: user.id })
        .from(user)
        .where(eq(user.role, "admin"));
      if (admins.length > 0) {
        const edited = decision.ownStatus === "visible";
        await tx.insert(notifications).values(
          admins.map((a) => ({
            userId: a.id,
            type: "system" as const,
            title: edited ? "Изменённый отзыв ждёт проверки" : "Новый отзыв ждёт проверки",
            body: `Оценка ${rating} из 5 о специалисте ${profile.fullName}.${
              edited ? " Прежняя версия снята с анкеты до вашего решения." : ""
            } Опубликуйте или скройте его в админ-панели, в разделе «Отзывы».`,
          }))
        );
      }
    }

    return { kind: "saved" as const, replaced: decision.ownStatus !== null };
  });

  if (outcome.kind === "busy") return { ok: false, error: "busy" };
  if (outcome.kind === "denied") {
    return { ok: false, error: outcome.reason, retryAfterSec: outcome.retryAfterSec };
  }

  // правка опубликованного отзыва снимает его с анкеты, главной и среднего в каталоге
  revalidatePath(`/specialists/${slug}`);
  revalidatePath("/catalog");
  revalidatePath("/");
  revalidatePath("/admin/reviews");
  return { ok: true, replaced: outcome.replaced };
}

const moderateSchema = z.object({
  reviewId: z.uuid(),
  status: z.enum(["visible", "hidden"]),
  /**
   * `updated_at` той версии, которую прочитал модератор. Публикация сверяет
   * его: если автор успел поправить отзыв, пока страница была открыта,
   * публиковать нечитанный текст нельзя.
   */
  seenUpdatedAt: z.iso.datetime().optional(),
});

/**
 * Решение модератора: опубликовать (`visible`) или скрыть (`hidden`).
 *
 * Отзыв не удаляется: решение должно быть обратимым, а «удалил и забыл» не
 * оставляет следа, если человек пожалуется. Специалист узнаёт об отзыве только
 * при публикации — не раньше, чтобы не получать уведомление о единице,
 * которую модератор потом скроет.
 */
export async function moderateReview(
  input: unknown
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "unauthorized" };
  if (session.user.role !== "admin") return { ok: false, error: "forbidden" };

  const parsed = moderateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { reviewId, status, seenUpdatedAt } = parsed.data;

  const out = await db.transaction(async (tx) => {
    // FOR UPDATE: правка автора ждёт решения модератора и наоборот
    const [row] = await tx
      .select({
        id: reviews.id,
        specialistId: reviews.specialistId,
        status: reviews.status,
        rating: reviews.rating,
        updatedAt: reviews.updatedAt,
      })
      .from(reviews)
      .where(eq(reviews.id, reviewId))
      .for("update")
      .limit(1);
    if (!row) return { ok: false as const, error: "not_found" };

    if (
      status === "visible" &&
      row.status !== "visible" &&
      (!seenUpdatedAt || row.updatedAt.toISOString() !== new Date(seenUpdatedAt).toISOString())
    ) {
      return { ok: false as const, error: "stale" };
    }

    const [profile] = await tx
      .select({ slug: specialistProfiles.slug, userId: specialistProfiles.userId })
      .from(specialistProfiles)
      .where(eq(specialistProfiles.id, row.specialistId))
      .limit(1);

    if (row.status !== status) {
      await tx.update(reviews).set({ status }).where(eq(reviews.id, row.id));
      await recalcRating(tx, row.specialistId);

      if (status === "visible" && profile) {
        await tx.insert(notifications).values({
          userId: profile.userId,
          type: "new_review",
          title: "Отзыв о вас опубликован",
          body: `Семья поставила оценку ${row.rating} из 5. Отзыв виден в вашей анкете.`,
        });
      }
    }

    return {
      ok: true as const,
      slug: profile?.slug ?? null,
      specialistId: row.specialistId,
    };
  });

  if (!out.ok) return out;

  revalidatePath("/admin");
  revalidatePath("/admin/reviews");
  revalidatePath(`/admin/profiles/${out.specialistId}`);
  revalidatePath("/catalog");
  revalidatePath("/");
  if (out.slug) revalidatePath(`/specialists/${out.slug}`);
  return { ok: true };
}
