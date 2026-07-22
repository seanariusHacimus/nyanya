import { trustBar } from "@/content/home";
import { Reveal } from "@/components/reveal";

/**
 * ⛳ D2: wordmark-заглушки из референса — заменить реальными партнёрами до запуска.
 */
export function TrustBar() {
  return (
    <section aria-label={trustBar.label} className="mx-auto max-w-[1400px] px-5 sm:px-8">
      <Reveal>
        <div className="flex flex-col items-center gap-8 rounded-[2px] bg-cream-deep px-8 py-12 sm:px-12 xl:flex-row xl:gap-14 xl:px-14 xl:py-14">
          <p className="label-caps shrink-0 text-ink-soft xl:border-r xl:border-line xl:pr-14">
            {trustBar.label}
          </p>
          <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 xl:w-full xl:justify-between xl:gap-x-8">
            {trustBar.brands.map((brand) => (
              <li
                key={brand}
                className="font-display text-lg tracking-[0.28em] text-ink-soft uppercase"
              >
                {brand}
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}
