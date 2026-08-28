"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Star, Warning } from "@phosphor-icons/react";
import { createReview } from "@/lib/actions/reviews";

/**
 * Форма отзыва о специалисте.
 *
 * Показывается только семье, которая открывала контакты этого специалиста, —
 * иначе отзывы писали бы люди, которые с ним не работали.
 *
 * Оценка обязательна, текст нет: поставить звёзды человек готов почти всегда,
 * а писать — далеко не всегда, и требовать текст значит остаться вовсе без
 * оценок.
 */
export function ReviewForm({
  slug,
  existing,
}: {
  slug: string;
  /** Прежний отзыв этой семьи — форма открывается заполненной. */
  existing: { rating: number; text: string } | null;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState(existing?.text ?? "");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = () =>
    start(async () => {
      setError(null);
      const result = await createReview({ slug, rating, text });
      if (!result.ok) {
        setError(
          result.error === "not_allowed"
            ? "Отзыв можно оставить после того, как вы откроете контакты специалиста."
            : result.error === "own_profile"
              ? "Нельзя оставить отзыв о собственной анкете."
              : result.error === "unauthorized"
                ? "Войдите, чтобы оставить отзыв."
                : "Не удалось сохранить отзыв. Попробуйте ещё раз."
        );
        return;
      }
      setDone(true);
      router.refresh();
    });

  if (done) {
    return (
      <div className="mt-8 flex items-start gap-3 border border-bronze bg-cream-deep px-5 py-4">
        <CheckCircle size={20} weight="fill" className="mt-0.5 shrink-0 text-bronze" />
        <p className="text-sm leading-relaxed text-ink">
          Спасибо — отзыв сохранён и уже виден в анкете. Изменить его можно в
          любой момент здесь же.
        </p>
      </div>
    );
  }

  const shown = hover || rating;

  return (
    <div className="mt-8 border border-line bg-paper p-6">
      <h3 className="font-display text-xl font-medium text-ink">
        {existing ? "Изменить отзыв" : "Оставить отзыв"}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Ваш опыт помогает другим семьям выбрать. Имя рядом с отзывом видят все.
      </p>

      <div className="mt-5 flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`Оценка ${n} из 5`}
            aria-pressed={rating === n}
            onMouseEnter={() => setHover(n)}
            onFocus={() => setHover(n)}
            onClick={() => setRating(n)}
            className="p-1 transition-transform duration-200 hover:scale-110"
          >
            <Star
              size={30}
              weight={n <= shown ? "fill" : "regular"}
              className={n <= shown ? "text-bronze" : "text-ink-faint"}
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-3 text-sm text-ink-soft">{rating} из 5</span>
        )}
      </div>

      <label htmlFor="review-text" className="mt-6 block text-sm font-semibold text-ink">
        Что хотите рассказать? <span className="font-normal text-ink-faint">— по желанию</span>
      </label>
      <textarea
        id="review-text"
        rows={4}
        value={text}
        maxLength={2000}
        onChange={(e) => setText(e.target.value)}
        placeholder="Как прошла работа, что понравилось, что стоит знать другим семьям"
        className="mt-2 w-full border border-line bg-cream px-4 py-3 text-base text-ink placeholder:text-ink-faint focus:border-ink"
      />

      {error && (
        <p
          role="alert"
          className="mt-4 flex items-start gap-3 border border-[#a5462f]/40 bg-[#a5462f]/5 px-4 py-3 text-sm leading-relaxed text-ink"
        >
          <Warning size={18} className="mt-0.5 shrink-0 text-[#a5462f]" />
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={rating === 0 || pending}
        className="label-caps mt-5 inline-flex min-h-12 items-center justify-center bg-ink px-8 text-cream transition-colors duration-300 hover:bg-charcoal active:translate-y-px disabled:opacity-40"
      >
        {pending ? "Сохраняем…" : existing ? "Сохранить изменения" : "Оставить отзыв"}
      </button>
      {rating === 0 && (
        <span className="ml-4 text-sm text-ink-soft">Поставьте оценку</span>
      )}
    </div>
  );
}
