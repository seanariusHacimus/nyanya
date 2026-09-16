"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Hourglass, Star, Warning } from "@phosphor-icons/react";
import { createReview } from "@/lib/actions/reviews";
import { reviewDenialText, type ReviewStatus } from "@/lib/review-policy";
import { formatRetryAfter } from "@/lib/unlock-limits";

/**
 * Форма отзыва о специалисте.
 *
 * Показывается только тому, кто открывал контакты этого специалиста и прошёл
 * правила `lib/review-policy.ts`, — иначе отзывы писали бы люди, которые с ним
 * не работали. Новый и изменённый отзыв уходит модератору и появляется в
 * анкете после публикации; форма говорит об этом до отправки, а не после.
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
  existing: {
    rating: number;
    text: string;
    status: Exclude<ReviewStatus, "hidden">;
  } | null;
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
        switch (result.error) {
          case "unauthorized":
            setError("Войдите, чтобы оставить отзыв.");
            break;
          case "busy":
            setError("Отзыв уже сохраняется. Подождите пару секунд и обновите страницу.");
            break;
          case "invalid":
          case "not_found":
            setError("Не удалось сохранить отзыв. Обновите страницу и попробуйте ещё раз.");
            break;
          default:
            setError(
              reviewDenialText(
                result.error,
                result.retryAfterSec ? formatRetryAfter(result.retryAfterSec) : null
              )
            );
        }
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
          Спасибо — отзыв отправлен на проверку. В анкете он появится, когда его
          опубликует модератор.
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
      {existing?.status === "pending" ? (
        <p className="mt-3 flex items-start gap-2 border border-line bg-cream-deep px-4 py-3 text-sm leading-relaxed text-ink">
          <Hourglass size={16} className="mt-0.5 shrink-0 text-bronze" aria-hidden="true" />
          Ваш отзыв на проверке у модератора. В анкете он появится после
          публикации.
        </p>
      ) : existing?.status === "visible" ? (
        <p className="mt-3 border border-line bg-cream-deep px-4 py-3 text-sm leading-relaxed text-ink">
          Ваш отзыв опубликован. Если измените его, он снова уйдёт на проверку и
          до публикации не будет виден в анкете.
        </p>
      ) : null}
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        Ваш опыт помогает другим семьям выбрать. Отзыв появится в анкете после
        проверки модератором; имя рядом с отзывом видят все.
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
