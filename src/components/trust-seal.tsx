import { cn } from "@/lib/utils";
import { clampScore } from "@/lib/format";

/**
 * The brand's signature element: a champagne-gold trust medallion.
 * Trust is the product, so we render the Trust Score as a wax-seal gauge.
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
  const value = clampScore(score);
  const r = 41;
  const circumference = 2 * Math.PI * r;
  const pct = value / 100;

  return (
    <div
      className={cn("relative inline-grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Trust Score ${value} of 100`}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        {/* outer hairline ring */}
        <circle cx="50" cy="50" r={46} fill="none" stroke="var(--line)" strokeWidth="1" />
        {/* track */}
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--ivory-deep)" strokeWidth="4" />
        {/* progress arc */}
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="var(--champagne)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center leading-none">
          <div
            className="font-display font-semibold text-royal-deep"
            style={{ fontSize: size * 0.26 }}
          >
            {value}
          </div>
          <div
            className="mt-1 uppercase tracking-[0.22em] text-gold-ink"
            style={{ fontSize: Math.max(7, size * 0.085) }}
          >
            Trust
          </div>
        </div>
      </div>
    </div>
  );
}
