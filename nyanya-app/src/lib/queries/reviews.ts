import { and, desc, eq, isNotNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { reviews, specialistProfiles, user } from "@/db/schema";
import { checkReviewEligibility } from "@/lib/review-eligibility";
import type { ReviewDenial, ReviewStatus } from "@/lib/review-policy";

/**
 * Может ли текущий пользователь оставить отзыв об этой анкете — та же проверка,
 * что в действии `createReview` (`lib/review-eligibility.ts`), без блокировок.
 *
 * Если отзыв уже есть, форма откроется заполненной, и человек поймёт, что
 * меняет своё мнение, а не пишет второе; статус нужен, чтобы честно сказать
 * «на проверке» или «опубликован». Скрытый модератором отзыв не правится —
 * автор видит нейтральное «Отзыв не опубликован модератором».
 */
export type ReviewAccess =
  | {
      canReview: true;
      existing: {
        rating: number;
        text: string;
        status: Exclude<ReviewStatus, "hidden">;
      } | null;
    }
  | {
      canReview: false;
      reason: ReviewDenial | "anonymous";
      /** для отказов, которые пройдут со временем: через сколько секунд */
      retryAfterSec: number | null;
    };

/** Гость: формы нет, текст — как для тех, кто не открывал контакты. */
export const ANONYMOUS_REVIEW_ACCESS: ReviewAccess = {
  canReview: false,
  reason: "anonymous",
  retryAfterSec: null,
};

export async function getReviewAccess(
  userId: string | null,
  slug: string
): Promise<ReviewAccess> {
  if (!userId) return ANONYMOUS_REVIEW_ACCESS;

  const [profile] = await db
    .select({ id: specialistProfiles.id, userId: specialistProfiles.userId })
    .from(specialistProfiles)
    .where(eq(specialistProfiles.slug, slug))
    .limit(1);
  if (!profile) {
    return { canReview: false, reason: "not_unlocked", retryAfterSec: null };
  }

  const { decision, own } = await checkReviewEligibility(db, {
    userId,
    profileId: profile.id,
    profileOwnerId: profile.userId,
  });
  if (!decision.allowed) {
    return {
      canReview: false,
      reason: decision.reason,
      retryAfterSec: decision.retryAfterSec,
    };
  }
  return {
    canReview: true,
    existing:
      own && own.status !== "hidden"
        ? { rating: own.rating, text: own.text, status: own.status }
        : null,
  };
}

/* --------------------------- отзывы на главной --------------------------- */

export type HomeReview = {
  id: string;
  rating: number;
  /** Обрезанный текст: полный читается в анкете. */
  excerpt: string;
  /** true — текст обрезан, и «Читать далее» ведёт к продолжению. */
  truncated: boolean;
  author: string;
  specialistName: string;
  specialistSlug: string;
};

/** Сколько символов показываем на главной до «Читать далее». */
const EXCERPT_LIMIT = 180;

/** Обрезка по границе слова — иначе фраза рвётся на половине слова. */
function excerpt(text: string): { excerpt: string; truncated: boolean } {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= EXCERPT_LIMIT) return { excerpt: clean, truncated: false };
  const cut = clean.slice(0, EXCERPT_LIMIT);
  const lastSpace = cut.lastIndexOf(" ");
  const body = (lastSpace > EXCERPT_LIMIT * 0.6 ? cut.slice(0, lastSpace) : cut)
    .replace(/[,;:—-]+$/, "")
    .trimEnd();
  return { excerpt: `${body}…`, truncated: true };
}

/**
 * Свежие отзывы для главной страницы.
 *
 * Берём только те, где семья что-то написала: карточка с одними звёздами
 * читателю ничего не даёт, а место занимает.
 *
 * Анкета обязана быть опубликованной, с адресом и не снятой самим
 * специалистом: ссылка «Читать далее» должна вести на живую страницу человека,
 * который сейчас готов работать, — иначе отзыв на главной приводит семью в
 * тупик.
 */
export async function getLatestReviews(limit = 6): Promise<HomeReview[]> {
  const rows = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      text: reviews.text,
      author: user.name,
      specialistName: specialistProfiles.fullName,
      specialistSlug: specialistProfiles.slug,
    })
    .from(reviews)
    .innerJoin(user, eq(user.id, reviews.authorParentId))
    .innerJoin(
      specialistProfiles,
      eq(specialistProfiles.id, reviews.specialistId)
    )
    .where(
      and(
        eq(reviews.status, "visible"),
        isNotNull(reviews.text),
        ne(reviews.text, ""),
        eq(specialistProfiles.status, "active"),
        eq(specialistProfiles.employed, false),
        isNotNull(specialistProfiles.slug)
      )
    )
    .orderBy(desc(reviews.createdAt))
    .limit(limit);

  return rows.map((row) => {
    const { excerpt: body, truncated } = excerpt(row.text ?? "");
    return {
      id: row.id,
      rating: row.rating,
      excerpt: body,
      truncated,
      author: row.author,
      specialistName: row.specialistName,
      specialistSlug: row.specialistSlug as string,
    };
  });
}
