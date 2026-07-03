import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { clampScore } from "@/lib/format";

/**
 * The brand's signature element: a champagne-gold trust medallion.
 * A full track keeps the coin visually complete (never a lopsided arc); the gold
 * fill rises to the score, with the number as the hero — legible from a catalog
 * card up to the profile hero.
 */
export function TrustSeal({
  score = 0,
  size = 88,
  className,
}: {
  score?: number;
  size?: number;
  className?: string;
}) {
  const t = useTranslations("common");
  const value = clampScore(score);
  const r = 42;
  const circumference = 2 * Math.PI * r;
  const pct = value / 100;

  return (
    <div
      className={cn("relative inline-grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${t("trustScore")}: ${value}/100`}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        {/* full track — keeps the ring complete and symmetric at any score */}
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--ivory-deep)" strokeWidth={7} />
        {/* gold fill up to the score */}
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="var(--champagne)"
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span
          className="font-display font-semibold text-royal-deep"
          style={{ fontSize: size * 0.32 }}
        >
          {value}
        </span>
        <span
          className="whitespace-nowrap uppercase text-gold-ink"
          style={{
            fontSize: Math.max(6.5, size * 0.1),
            letterSpacing: "0.12em",
            marginTop: size * 0.035,
          }}
        >
          {t("trust")}
        </span>
      </div>
    </div>
  );
}
