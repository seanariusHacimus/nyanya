import { and, asc, eq, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { DbExecutor } from "@/db";
import { contactUnlocks, reviews, user } from "@/db/schema";
import {
  decideReview,
  type ReviewDecision,
  type ReviewFacts,
  type ReviewStatus,
} from "@/lib/review-policy";

/**
 * Факты для `decideReview` — одна проверка и для страницы анкеты (показать ли
 * форму и какой текст), и для серверного действия `createReview`: форма,
 * показанная семье, не может упереться в правило, о котором страница не знала.
 *
 * Время — только из базы (`clock_timestamp()`), которая сама пишет
 * `created_at` и `unlocked_at`: не `now()`, потому что в действии запрос идёт
 * внутри транзакции после блокировки, а `now()` заморожено на её начале.
 *
 * `lockOwnReview` — только внутри транзакции действия: свой отзыв читается
 * `FOR UPDATE`, чтобы модератор не поменял его статус между проверкой и
 * записью.
 */
export async function loadReviewFacts(
  exec: DbExecutor,
  p: {
    userId: string;
    profileId: string;
    profileOwnerId: string;
    lockOwnReview?: boolean;
  }
): Promise<ReviewFacts & { own: { rating: number; text: string } | null }> {
  const secondsSince = (column: AnyPgColumn) =>
    sql<number>`extract(epoch from (clock_timestamp() - ${column}))::float8`;

  const ownQuery = exec
    .select({ status: reviews.status, rating: reviews.rating, text: reviews.text })
    .from(reviews)
    .where(and(eq(reviews.specialistId, p.profileId), eq(reviews.authorParentId, p.userId)))
    .limit(1);

  const [[account], [unlock], [own], recent] = await Promise.all([
    exec
      .select({ ageSec: secondsSince(user.createdAt) })
      .from(user)
      .where(eq(user.id, p.userId))
      .limit(1),
    exec
      .select({ ageSec: secondsSince(contactUnlocks.unlockedAt) })
      .from(contactUnlocks)
      .where(
        and(
          eq(contactUnlocks.parentId, p.userId),
          eq(contactUnlocks.specialistId, p.profileId)
        )
      )
      .limit(1),
    p.lockOwnReview ? ownQuery.for("update") : ownQuery,
    exec
      .select({
        secondsLeft: sql<number>`extract(epoch from (${reviews.createdAt} + interval '24 hours' - clock_timestamp()))::float8`,
      })
      .from(reviews)
      .where(
        and(
          eq(reviews.authorParentId, p.userId),
          sql`${reviews.createdAt} > clock_timestamp() - interval '24 hours'`
        )
      )
      .orderBy(asc(reviews.createdAt)),
  ]);

  return {
    isOwnProfile: p.profileOwnerId === p.userId,
    accountAgeSec: account ? Number(account.ageSec) : null,
    unlockAgeSec: unlock ? Number(unlock.ageSec) : null,
    ownStatus: own?.status ?? null,
    windowSecondsLeft: recent.map((r) => Number(r.secondsLeft)),
    own: own ? { rating: own.rating, text: own.text ?? "" } : null,
  };
}

export async function checkReviewEligibility(
  exec: DbExecutor,
  p: Parameters<typeof loadReviewFacts>[1]
): Promise<{
  decision: ReviewDecision;
  own: { rating: number; text: string; status: ReviewStatus } | null;
}> {
  const facts = await loadReviewFacts(exec, p);
  return {
    decision: decideReview(facts),
    own:
      facts.own && facts.ownStatus
        ? { ...facts.own, status: facts.ownStatus }
        : null,
  };
}
