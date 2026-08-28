import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { contactUnlocks, reviews, specialistProfiles } from "@/db/schema";

/**
 * Может ли текущий пользователь оставить отзыв об этой анкете.
 *
 * Право даёт только открытие контактов: это единственный след, что семья с
 * этим специалистом действительно имела дело. Заодно возвращаем прежний
 * отзыв, если он был, — форма откроется заполненной, и человек поймёт, что
 * меняет своё мнение, а не пишет второе.
 */
export type ReviewAccess = {
  canReview: boolean;
  existing: { rating: number; text: string } | null;
};

export async function getReviewAccess(
  userId: string | null,
  slug: string
): Promise<ReviewAccess> {
  if (!userId) return { canReview: false, existing: null };

  const [profile] = await db
    .select({ id: specialistProfiles.id, userId: specialistProfiles.userId })
    .from(specialistProfiles)
    .where(eq(specialistProfiles.slug, slug))
    .limit(1);
  if (!profile || profile.userId === userId) {
    return { canReview: false, existing: null };
  }

  const [unlocked] = await db
    .select({ id: contactUnlocks.id })
    .from(contactUnlocks)
    .where(
      and(
        eq(contactUnlocks.parentId, userId),
        eq(contactUnlocks.specialistId, profile.id)
      )
    )
    .limit(1);
  if (!unlocked) return { canReview: false, existing: null };

  const [own] = await db
    .select({ rating: reviews.rating, text: reviews.text })
    .from(reviews)
    .where(
      and(
        eq(reviews.specialistId, profile.id),
        eq(reviews.authorParentId, userId)
      )
    )
    .limit(1);

  return {
    canReview: true,
    existing: own ? { rating: own.rating, text: own.text ?? "" } : null,
  };
}
