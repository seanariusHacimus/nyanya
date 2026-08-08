import { Star } from "@phosphor-icons/react/dist/ssr";

/** Рейтинг ★: заполненные и контурные звёзды + числовое значение для AT. */
export function Stars({
  rating,
  className = "",
}: {
  rating: number;
  className?: string;
}) {
  const full = Math.round(rating);
  return (
    <span
      className={`inline-flex items-center gap-0.5 ${className}`}
      role="img"
      aria-label={`Оценка ${rating} из 5`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={14}
          weight={i < full ? "fill" : "regular"}
          className={i < full ? "text-bronze" : "text-ink-faint"}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}
