"use server";

import { z } from "zod";
import { and, avg, count, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { contactUnlocks, notifications, reviews, specialistProfiles } from "@/db/schema";

/**
 * Отзывы о специалисте.
 *
 * Таблица `reviews` существовала с самого начала, и страница анкеты умела их
 * показывать — но оставить отзыв было негде: записи в неё не делал никто.
 * Поэтому у всех анкет стояло «Пока нет отзывов», а рейтинг оставался нулевым.
 *
 * Кто может оставить отзыв: только семья, которая **открыла контакты** этого
 * специалиста. Это единственный след взаимодействия, который у нас есть.
 * Пускать любого вошедшего значит открыть дверь заказным отзывам и мести
 * конкурентов — на площадке, которая продаёт доверие, это дороже, чем
 * несколько недополученных отзывов.
 *
 * Один отзыв на пару «семья — специалист»: повторный не добавляется, а
 * заменяет прежний. Человек мог передумать, но накручивать среднее одному
 * специалисту в одиночку не должен.
 */

const schema = z.object({
  slug: z.string().trim().min(1).max(120),
  rating: z.number().int().min(1).max(5),
  text: z.string().trim().max(2000).optional().default(""),
});

export type ReviewResult =
  | { ok: true; replaced: boolean }
  | { ok: false; error: string };

export async function createReview(input: unknown): Promise<ReviewResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "unauthorized" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { slug, rating, text } = parsed.data;

  const [profile] = await db
    .select({ id: specialistProfiles.id, userId: specialistProfiles.userId })
    .from(specialistProfiles)
    .where(eq(specialistProfiles.slug, slug))
    .limit(1);
  if (!profile) return { ok: false, error: "not_found" };

  // сам себе отзыв оставить нельзя
  if (profile.userId === session.user.id) return { ok: false, error: "own_profile" };

  const [unlocked] = await db
    .select({ id: contactUnlocks.id })
    .from(contactUnlocks)
    .where(
      and(
        eq(contactUnlocks.parentId, session.user.id),
        eq(contactUnlocks.specialistId, profile.id)
      )
    )
    .limit(1);
  if (!unlocked) return { ok: false, error: "not_allowed" };

  const [existing] = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(
      and(
        eq(reviews.specialistId, profile.id),
        eq(reviews.authorParentId, session.user.id)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .update(reviews)
      .set({ rating, text: text || null, createdAt: new Date() })
      .where(eq(reviews.id, existing.id));
  } else {
    await db.insert(reviews).values({
      specialistId: profile.id,
      authorParentId: session.user.id,
      rating,
      text: text || null,
    });
  }

  await recalcRating(profile.id);

  // специалист должен узнать об отзыве, а не обнаружить его случайно
  await db.insert(notifications).values({
    userId: profile.userId,
    type: "system",
    title: existing ? "Отзыв обновлён" : "Новый отзыв о вас",
    body: `Семья поставила оценку ${rating} из 5. Отзыв виден в вашей анкете.`,
  });

  revalidatePath(`/specialists/${slug}`);
  revalidatePath("/catalog");
  return { ok: true, replaced: Boolean(existing) };
}

/**
 * Пересчёт среднего и количества.
 *
 * Считается по видимым отзывам: скрытый модератором не должен продолжать
 * тянуть средний балл вверх или вниз. Колонки `rating_avg` и `review_count`
 * до этого не писал никто — они существовали и всегда показывали ноль.
 */
export async function recalcRating(profileId: string): Promise<void> {
  const [agg] = await db
    .select({ avgRating: avg(reviews.rating), total: count() })
    .from(reviews)
    .where(
      and(eq(reviews.specialistId, profileId), eq(reviews.status, "visible"))
    );

  await db
    .update(specialistProfiles)
    .set({
      ratingAvg: agg?.avgRating ? Number(agg.avgRating).toFixed(2) : "0",
      reviewCount: Number(agg?.total ?? 0),
      updatedAt: new Date(),
    })
    .where(eq(specialistProfiles.id, profileId));
}

/**
 * Скрыть или вернуть отзыв — только администратор.
 *
 * Без этого отзывы выкатывать нельзя: оскорбление, чужая реклама или сведение
 * счётов остались бы в анкете навсегда. Отзыв не удаляется, а прячется —
 * так видно, что решение принято, и его можно отменить.
 */
export async function moderateReview(input: {
  reviewId: string;
  hidden: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "unauthorized" };
  if (session.user.role !== "admin") return { ok: false, error: "forbidden" };

  const [row] = await db
    .select({ id: reviews.id, specialistId: reviews.specialistId })
    .from(reviews)
    .where(eq(reviews.id, input.reviewId))
    .limit(1);
  if (!row) return { ok: false, error: "not_found" };

  await db
    .update(reviews)
    .set({ status: input.hidden ? "hidden" : "visible" })
    .where(eq(reviews.id, row.id));

  // средний балл считается по видимым — скрытый не должен на него влиять
  await recalcRating(row.specialistId);

  const [profile] = await db
    .select({ slug: specialistProfiles.slug })
    .from(specialistProfiles)
    .where(eq(specialistProfiles.id, row.specialistId))
    .limit(1);

  revalidatePath("/admin");
  revalidatePath("/catalog");
  if (profile?.slug) revalidatePath(`/specialists/${profile.slug}`);
  return { ok: true };
}
