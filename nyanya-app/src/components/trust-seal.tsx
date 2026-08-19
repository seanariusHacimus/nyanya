import { HandHeart } from "@phosphor-icons/react/dist/ssr";

/**
 * Круглая печать доверия — фирменный знак nyanya.uz (по референсу).
 * Кольцевой текст медленно вращается; в reduced-motion неподвижен.
 */
export function TrustSeal({
  words,
  className,
}: {
  words: readonly string[];
  className?: string;
}) {
  const ring = words.map((w) => w.toUpperCase()).join(" · ") + " · ";

  return (
    <div className={className} aria-hidden="true">
      <svg viewBox="0 0 200 200" className="size-full">
        <circle
          cx="100"
          cy="100"
          r="97"
          fill="var(--color-cream)"
          fillOpacity="0.92"
          stroke="var(--color-bronze)"
          strokeWidth="1"
        />
        <circle
          cx="100"
          cy="100"
          r="52"
          fill="none"
          stroke="var(--color-bronze)"
          strokeWidth="1"
        />
        <g className="seal-rotate">
          <defs>
            <path
              id="seal-text-circle"
              d="M 100,100 m -74,0 a 74,74 0 1,1 148,0 a 74,74 0 1,1 -148,0"
            />
          </defs>
          <text
            fill="var(--color-bronze)"
            fontSize="13.5"
            letterSpacing="2.5"
            fontWeight="500"
          >
            <textPath href="#seal-text-circle" textLength="463">
              {ring}
            </textPath>
          </text>
        </g>
      </svg>
      <HandHeart
        weight="thin"
        className="absolute top-1/2 left-1/2 size-9 -translate-x-1/2 -translate-y-1/2 text-bronze"
      />
    </div>
  );
}
