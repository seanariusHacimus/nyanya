const sizes = {
  /** для карточек каталога */
  sm: { box: "size-12", number: "text-sm", label: "hidden" },
  /** для профиля и инфостраниц */
  lg: { box: "size-24 sm:size-28", number: "text-2xl sm:text-3xl", label: "block" },
} as const;

/** Круглый индекс доверия — числовая форма фирменной печати. */
export function TrustScore({
  score,
  size = "sm",
  className = "",
}: {
  score: number;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const s = sizes[size];
  return (
    <div
      className={`flex ${s.box} flex-col items-center justify-center rounded-full border border-bronze bg-cream text-center ${className}`}
      title={`Индекс доверия: ${score} из 100`}
    >
      <span className={`font-display ${s.number} leading-none font-medium text-bronze-text`}>
        {score}
      </span>
      <span className={`${s.label} label-caps mt-1 text-[9px] text-bronze-text`}>
        доверие
      </span>
    </div>
  );
}
