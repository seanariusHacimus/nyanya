import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { services } from "@/content/home";
import { Reveal } from "@/components/reveal";

export function Services() {
  return (
    <section className="mx-auto max-w-[1400px] px-5 py-24 sm:px-8 lg:py-32">
      <Reveal className="flex flex-wrap items-end justify-between gap-6">
        <h2 className="max-w-[13ch] font-display text-4xl leading-[1.12] font-medium text-ink sm:text-5xl">
          {services.title}
        </h2>
        <Link
          href={services.link.href}
          className="label-caps group mb-2 flex items-center gap-3 text-ink transition-colors duration-300 hover:text-bronze-text"
        >
          <span className="border-b border-ink/30 pb-1 transition-colors duration-300 group-hover:border-bronze">
            {services.link.label}
          </span>
          <ArrowRight
            size={14}
            className="transition-transform duration-300 group-hover:translate-x-1"
          />
        </Link>
      </Reveal>

      <div className="mt-14 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {services.cards.map((card, i) => (
          <Reveal key={card.href} delay={i * 0.08}>
            <Link
              href={card.href}
              className="group relative block aspect-3/4 overflow-hidden rounded-[2px] bg-charcoal"
            >
              <Image
                src={card.image.src}
                alt=""
                placeholder="blur"
                sizes="(max-width: 640px) 92vw, (max-width: 1280px) 46vw, 23vw"
                className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out-quart group-hover:scale-[1.04]"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-linear-to-t from-charcoal-deep/95 via-charcoal-deep/35 to-transparent"
              />
              <div className="absolute inset-x-0 bottom-0 p-7">
                <h3 className="font-display text-[1.75rem] font-medium text-cream">
                  {card.title}
                </h3>
                <p className="mt-2 max-w-[24ch] text-sm leading-relaxed text-cream/75">
                  {card.description}
                </p>
                <ArrowRight
                  size={20}
                  aria-hidden="true"
                  className="mt-5 text-cream/80 transition-transform duration-300 group-hover:translate-x-2"
                />
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
