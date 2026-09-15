"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle, Eye, EyeSlash, Star, Warning } from "@phosphor-icons/react";
import { moderateReview } from "@/lib/actions/reviews";
import type { ReviewStatus } from "@/lib/review-policy";

/**
 * Отзывы у администратора — в очереди `/admin/reviews` и в карточке анкеты.
 * Один компонент на оба места, чтобы подписи и кнопки не разъехались.
 *
 * Новый и изменённый отзыв приходит со статусом «на проверке» и семьям не виден,
 * пока его не опубликуют. Скрытый отзыв остаётся в базе и перестаёт влиять на
 * средний балл. Удаления нет намеренно: решение модератора должно быть
 * обратимым, а «удалил и забыл» не оставляет следа, если человек пожалуется.
 */
export type AdminReview = {
  id: string;
  rating: number;
  text: string;
  author: string;
  status: ReviewStatus;
  /** ISO — когда отзыв появился */
  createdAt: string;
  /** ISO — последняя правка автора; уходит в moderateReview как прочитанная версия */
  updatedAt: string;
  /** в общей очереди — о ком отзыв */
  specialist?: { id: string; name: string; slug: string | null };
  /** в общей очереди — по чему отличить семью от второго аккаунта */
  signals?: {
    authorEmail: string;
    authorRole: string;
    accountAgeDays: number;
    unlockAgeDays: number | null;
    authorReviewsTotal: number;
  };
};

const ROLE_LABEL: Record<string, string> = {
  parent: "семья",
  specialist: "специалист",
  admin: "администратор",
};

const ERROR_TEXT: Record<string, string> = {
  unauthorized: "Сессия истекла — войдите заново.",
  forbidden: "Недостаточно прав.",
  invalid: "Некорректные данные — обновите страницу.",
  not_found: "Отзыв не найден — обновите страницу.",
  stale:
    "Автор изменил отзыв, пока страница была открыта. Страница обновлена — прочитайте новую версию и решите снова.",
};

/** Дата — по Ташкенту, пояс задан явно: компонент рендерится и на сервере, и в браузере. */
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Tashkent",
  });
}

function ageLabel(days: number) {
  return days < 1 ? "меньше суток" : `${days} дн.`;
}

const primaryButton =
  "label-caps inline-flex min-h-10 shrink-0 items-center gap-2 bg-ink px-4 text-cream transition-colors duration-300 hover:bg-charcoal disabled:opacity-50";
const secondaryButton =
  "label-caps inline-flex min-h-10 shrink-0 items-center gap-2 border border-ink px-4 text-ink transition-colors duration-300 hover:bg-ink hover:text-cream disabled:opacity-50";

export function AdminReviews({
  reviews,
  emptyText = "Отзывов пока нет. Их оставляют семьи, которые открыли контакты этого специалиста.",
}: {
  reviews: AdminReview[];
  emptyText?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<{ id: string; text: string } | null>(null);

  if (reviews.length === 0) {
    return (
      <p className="mt-5 border border-line bg-paper px-5 py-6 text-sm text-ink-soft">
        {emptyText}
      </p>
    );
  }

  const decide = (r: AdminReview, status: "visible" | "hidden") =>
    start(async () => {
      setBusyId(r.id);
      setError(null);
      const result = await moderateReview({
        reviewId: r.id,
        status,
        seenUpdatedAt: r.updatedAt,
      });
      if (!result.ok) {
        setError({
          id: r.id,
          text: ERROR_TEXT[result.error ?? ""] ?? "Не удалось выполнить действие.",
        });
      }
      setBusyId(null);
      router.refresh();
    });

  return (
    <ul className="mt-5 space-y-3">
      {reviews.map((r) => {
        const busy = pending && busyId === r.id;
        const edited = r.updatedAt !== r.createdAt;
        const s = r.signals;
        // модератор должен заметить это раньше текста
        const suspicious =
          s !== undefined &&
          (s.accountAgeDays < 2 ||
            s.unlockAgeDays === null ||
            s.authorReviewsTotal > 3 ||
            s.authorRole !== "parent");
        return (
          <li
            key={r.id}
            className={`border p-5 ${
              r.status === "pending"
                ? "border-bronze/60 bg-paper"
                : r.status === "hidden"
                  ? "border-line bg-cream opacity-70"
                  : "border-line bg-paper"
            }`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 sm:flex-1">
                {r.specialist && (
                  <p className="text-sm text-ink-soft">
                    О специалисте{" "}
                    <Link
                      href={`/admin/profiles/${r.specialist.id}`}
                      className="border-b border-ink/30 font-semibold text-ink transition-colors duration-300 hover:border-bronze hover:text-bronze-text"
                    >
                      {r.specialist.name}
                    </Link>
                    {r.specialist.slug && (
                      <>
                        {" · "}
                        <Link
                          href={`/specialists/${r.specialist.slug}#reviews`}
                          className="border-b border-ink/30 text-ink-soft transition-colors duration-300 hover:border-bronze hover:text-bronze-text"
                        >
                          анкета на сайте
                        </Link>
                      </>
                    )}
                  </p>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="sr-only">Оценка {r.rating} из 5</span>
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
                    {r.author} · {formatDate(r.createdAt)}
                    {edited && ` · изменён ${formatDate(r.updatedAt)}`}
                  </span>
                </div>
                {s && (
                  <p
                    className={`mt-1 text-xs ${
                      suspicious ? "font-semibold text-bronze-text" : "text-ink-faint"
                    }`}
                  >
                    <span className="break-all">{s.authorEmail}</span> ·{" "}
                    {ROLE_LABEL[s.authorRole] ?? s.authorRole} · аккаунту{" "}
                    {ageLabel(s.accountAgeDays)} ·{" "}
                    {s.unlockAgeDays === null
                      ? "контакты не открывал"
                      : `контакты открыты ${ageLabel(s.unlockAgeDays)} назад`}{" "}
                    · отзывов от автора: {s.authorReviewsTotal}
                  </p>
                )}
                <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-ink">
                  {r.text || (
                    <span className="text-ink-faint">Оценка без комментария</span>
                  )}
                </p>
                {r.status === "pending" && (
                  <p className="label-caps mt-2 text-bronze-text">
                    на проверке — в анкете не показывается и в среднем балле не
                    учитывается
                  </p>
                )}
                {r.status === "hidden" && (
                  <p className="label-caps mt-2 text-ink-faint">
                    скрыт — в анкете не показывается и в среднем балле не учитывается
                  </p>
                )}
                {error?.id === r.id && (
                  <p
                    role="alert"
                    className="mt-3 flex items-start gap-2 text-sm text-[#a5462f]"
                  >
                    <Warning size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                    {error.text}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {r.status !== "visible" && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => decide(r, "visible")}
                    className={primaryButton}
                  >
                    {r.status === "pending" ? (
                      <CheckCircle size={14} aria-hidden="true" />
                    ) : (
                      <Eye size={14} aria-hidden="true" />
                    )}
                    Опубликовать
                  </button>
                )}
                {r.status !== "hidden" && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => decide(r, "hidden")}
                    className={secondaryButton}
                  >
                    <EyeSlash size={14} aria-hidden="true" />
                    Скрыть
                  </button>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
