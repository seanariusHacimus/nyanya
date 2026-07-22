import Image from "next/image";
import { ctaBand } from "@/content/home";
import { Reveal } from "@/components/reveal";
import { ButtonLink } from "@/components/ui/button-link";

/**
 * ⛳ D3: «10 000 семей» — строка-заглушка, заменить реальной метрикой до запуска.
 * D4: две кнопки — для семей и для специалистов.
 */
export function CtaBand() {
  return (
    <section className="mx-auto max-w-[1400px] px-5 pb-24 sm:px-8 lg:pb-32">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2px] bg-charcoal">
          <Image
            src={ctaBand.image.src}
            alt=""
            aria-hidden="true"
            placeholder="blur"
            sizes="(max-width: 1400px) 100vw, 1336px"
            className="absolute inset-0 size-full object-cover object-right"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-linear-to-r from-charcoal-deep/95 via-charcoal-deep/55 to-transparent"
          />
          <div className="relative px-8 py-24 sm:px-12 lg:px-20 lg:py-32">
            <div className="max-w-2xl">
              <h2 className="font-display text-4xl leading-[1.12] font-medium whitespace-pre-line text-cream sm:text-5xl">
                {ctaBand.title}
              </h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-cream/70">
                {ctaBand.subtitle}
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <ButtonLink href={ctaBand.primary.href} variant="bronze">
                  {ctaBand.primary.label}
                </ButtonLink>
                <ButtonLink href={ctaBand.secondary.href} variant="outline-light">
                  {ctaBand.secondary.label}
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
