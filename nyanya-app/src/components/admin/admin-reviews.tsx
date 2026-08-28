"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeSlash, Star } from "@phosphor-icons/react";
import { moderateReview } from "@/lib/actions/reviews";

/**
 * Отзывы о специалисте в карточке администратора.
 *
 * Скрытый отзыв остаётся в базе и перестаёт влиять на средний балл. Удаления
 * нет намеренно: решение модератора должно быть обратимым, а «удалил и забыл»
 * не оставляет следа, если человек пожалуется.
 */
export type AdminReview = {
  id: string;
  rating: number;
  text: string;
  author: string;
  hidden: boolean;
  createdAt: string;
};

export function AdminReviews({ reviews }: { reviews: AdminReview[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  if (reviews.length === 0) {
    return (
      <p className="mt-5 border border-line bg-paper px-5 py-6 text-sm text-ink-soft">
        Отзывов пока нет. Их оставляют семьи, которые открыли контакты этого
        специалиста.
      </p>
    );
  }

  return (
    <ul className="mt-5 space-y-3">
      {reviews.map((r) => (
        <li
          key={r.id}
          className={`border p-5 ${
            r.hidden ? "border-line bg-cream opacity-60" : "border-line bg-paper"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    size={14}
                    weight={n <= r.rating ? "fill" : "regular"}
                    className={n <= r.rating ? "text-bronze" : "text-ink-faint"}
                    aria-hidden="true"
                  />
                ))}
                <span className="ml-2 text-sm text-ink-soft">
                  {r.author} · {r.createdAt}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink">
                {r.text || (
                  <span className="text-ink-faint">Оценка без комментария</span>
                )}
              </p>
              {r.hidden && (
                <p className="label-caps mt-2 text-ink-faint">
                  скрыт — в анкете не показывается и в среднем балле не учитывается
                </p>
              )}
            </div>

            <button
              type="button"
              disabled={pending && busyId === r.id}
              onClick={() =>
                start(async () => {
                  setBusyId(r.id);
                  await moderateReview({ reviewId: r.id, hidden: !r.hidden });
                  setBusyId(null);
                  router.refresh();
                })
              }
              className="label-caps inline-flex min-h-10 shrink-0 items-center gap-2 border border-ink px-4 text-ink transition-colors duration-300 hover:bg-ink hover:text-cream disabled:opacity-50"
            >
              {r.hidden ? <Eye size={14} /> : <EyeSlash size={14} />}
              {r.hidden ? "Вернуть" : "Скрыть"}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
