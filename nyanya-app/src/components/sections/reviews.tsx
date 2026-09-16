import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { getLatestReviews } from "@/lib/queries/reviews";
import { Stars } from "@/components/ui/stars";
import { Reveal } from "@/components/reveal";

/**
 * Отзывы семей на главной.
 *
 * Секции нет вовсе, пока не написан ни один отзыв: пустая рамка с заголовком
 * «Отзывы семей» на первой же странице говорит новому посетителю ровно одно —
 * здесь никого нет. Лучше не обещать того, чего пока не набралось.
 *
 * Карточки с собственной рамкой, а не общая сетка на фоновой линии: отзывов
 * почти всегда не кратное число колонкам, и на фоновом приёме незаполненные
 * клетки ряда проступали серыми пятнами. Ширина колонок тоже считается от
 * количества — единственный отзыв в трёхколоночной сетке смотрелся бы обрезком.
 */
export async function Reviews() {
  const reviews = await getLatestReviews(6);
  if (reviews.length === 0) return null;

  const columns =
    reviews.length === 1
      ? "mx-auto max-w-2xl"
      : reviews.length === 2
        ? "mx-auto max-w-4xl sm:grid-cols-2"
        : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <section className="mx-auto max-w-[1400px] px-5 py-24 sm:px-8 lg:py-32">
      <Reveal className="flex flex-wrap items-end justify-between gap-6">
        {/*
          Не «Отзывы семей»: так называется плитка выше на этой же странице, и
          два одинаковых заголовка на одном экране читаются как ошибка вёрстки.
        */}
        <h2 className="max-w-[14ch] font-display text-4xl leading-[1.12] font-medium text-ink sm:text-5xl">
          Что говорят семьи
        </h2>
        <Link
          href="/catalog"
          className="label-caps group mb-2 flex items-center gap-3 text-ink transition-colors duration-300 hover:text-bronze-text"
        >
          <span className="border-b border-ink/30 pb-1 transition-colors duration-300 group-hover:border-bronze">
            Смотреть специалистов
          </span>
          <ArrowRight
            size={14}
            className="transition-transform duration-300 group-hover:translate-x-1"
          />
        </Link>
      </Reveal>

      <Reveal className={`mt-14 grid gap-6 ${columns}`}>
        {reviews.map((review) => (
          <article
            key={review.id}
            className="flex flex-col border border-line bg-paper p-8"
          >
            <Stars rating={review.rating} />

            <p className="mt-5 flex-1 text-base leading-relaxed text-ink-soft">
              {review.excerpt}
            </p>

            <p className="mt-6 text-sm text-ink-faint">
              {review.author} — о специалисте{" "}
              <span className="text-ink">{review.specialistName}</span>
            </p>

            <Link
              href={`/specialists/${review.specialistSlug}#reviews`}
              className="label-caps mt-4 inline-flex items-center gap-2 self-start border-b border-ink/30 pb-0.5 text-ink transition-colors duration-300 hover:border-bronze hover:text-bronze-text"
            >
              {review.truncated ? "Читать далее" : "Смотреть анкету"}
            </Link>
          </article>
        ))}
      </Reveal>
    </section>
  );
}
