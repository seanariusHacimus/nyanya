import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { clampScore } from "@/lib/format";

/**
 * The brand's trust medallion: a slim ring frames the coin edge and fills with
 * champagne to the score, with the number centred inside. The "trust" caption
 * only appears on the larger medallions (profile, detail, hero) where it has
 * room; on a catalog card the number stands alone.
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
  const r = 43;
  const circumference = 2 * Math.PI * r;
  const pct = value / 100;
  const showLabel = size >= 76;

  return (
    <div
      className={cn("relative inline-grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${t("trustScore")}: ${value}/100`}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full">
        {/* complete slim ring = the frame (always a full, even border) */}
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="var(--champagne)"
          strokeWidth={4}
          opacity={0.28}
        />
        {/* champagne fill grows symmetrically from the top; gap stays centred at the bottom */}
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="var(--champagne)"
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          transform={`rotate(${-90 - pct * 180} 50 50)`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span
          className="font-display font-semibold text-ink"
          style={{
            fontSize: size * (showLabel ? 0.32 : 0.4),
            transform: "translateY(0.03em)",
          }}
        >
          {value}
        </span>
        {showLabel && (
          <span
            className="mt-[0.18em] whitespace-nowrap uppercase text-gold-ink"
            style={{ fontSize: size * 0.094, letterSpacing: "0.18em", paddingLeft: "0.18em" }}
          >
            {t("trust")}
          </span>
        )}
      </div>
    </div>
  );
}
