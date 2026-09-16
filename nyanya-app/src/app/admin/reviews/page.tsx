import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getSessionUncached } from "@/lib/auth";
import {
  getAdminReviewQueue,
  getPendingReviewCount,
  REVIEW_QUEUE_LIMIT,
} from "@/lib/queries/admin";
import { REVIEW_POLICY } from "@/lib/review-policy";
import { AdminReviews } from "@/components/admin/admin-reviews";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Отзывы",
  robots: { index: false, follow: false },
};

/**
 * Очередь отзывов. С премодерацией (решение владельца, 2026-09-16) ни один
 * новый или изменённый отзыв не появляется в анкете, пока его не опубликуют
 * здесь или в карточке анкеты.
 */
export default async function AdminReviewsPage() {
  // проверка роли повторяется на странице: layout защитой не является
  // роль читается из базы, мимо кэша сессии в куке: снятая роль и
  // блокировка должны закрывать админку сразу
  const session = await getSessionUncached(await headers());
  if (!session) redirect("/login?next=/admin/reviews");
  if (session.user.role !== "admin") notFound();

  const [rows, waiting] = await Promise.all([
    getAdminReviewQueue(),
    getPendingReviewCount(),
  ]);

  return (
    <div className="max-w-[960px]">
      <h1 className="font-display text-3xl leading-[1.08] font-medium text-ink sm:text-4xl">
        Отзывы
      </h1>
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-ink-soft">
        Новый или изменённый отзыв семьи не видят, пока вы его не опубликуете;
        средний балл анкеты считается только по опубликованным. Специалист узнаёт
        об отзыве в момент публикации. Отзыв оставляет только тот, кто открыл
        контакты специалиста не меньше {REVIEW_POLICY.minUnlockAgeHours} ч назад,
        с аккаунта старше {REVIEW_POLICY.minAccountAgeHours} ч и не больше{" "}
        {REVIEW_POLICY.dailyNewReviewsCap} новых отзывов за 24 часа. Выделенная
        строка под автором — повод присмотреться: молодой аккаунт, автор не
        семья, контакты не открыты или у автора много отзывов.
      </p>
      <p className="mt-4 text-sm text-ink">
        Ждут решения: <span className="font-semibold">{waiting}</span>
        {rows.length >= REVIEW_QUEUE_LIMIT &&
          ` · показаны первые ${REVIEW_QUEUE_LIMIT}`}
      </p>

      <AdminReviews
        emptyText="Отзывов пока нет."
        reviews={rows.map((r) => ({
          id: r.id,
          rating: r.rating,
          text: r.text,
          author: r.author,
          status: r.status,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          specialist: { id: r.specialistId, name: r.specialistName, slug: r.specialistSlug },
          signals: {
            authorEmail: r.authorEmail,
            authorRole: r.authorRole,
            accountAgeDays: r.accountAgeDays,
            unlockAgeDays: r.unlockAgeDays,
            authorReviewsTotal: r.authorReviewsTotal,
          },
        }))}
      />
    </div>
  );
}
