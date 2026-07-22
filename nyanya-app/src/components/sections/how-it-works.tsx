import {
  SquaresFour,
  MagnifyingGlass,
  LockKeyOpen,
  Handshake,
} from "@phosphor-icons/react/dist/ssr";
import { howItWorks } from "@/content/home";
import { Reveal } from "@/components/reveal";

const icons = {
  grid: SquaresFour,
  search: MagnifyingGlass,
  unlock: LockKeyOpen,
  handshake: Handshake,
} as const;

export function HowItWorks() {
  return (
    <section>
      <div className="mx-auto grid max-w-[1400px] gap-12 px-5 py-24 sm:px-8 lg:py-32 xl:grid-cols-[1fr_3fr] xl:gap-20">
        <Reveal>
          <h2 className="max-w-[10ch] font-display text-4xl leading-[1.12] font-medium text-ink sm:text-5xl">
            {howItWorks.title}
          </h2>
        </Reveal>

        <div className="relative">
          <div
            aria-hidden="true"
            className="absolute top-10 left-10 right-[calc(25%-4rem)] hidden border-t border-dashed border-line lg:block"
          />
          <ol className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {howItWorks.steps.map((step, i) => {
              const Icon = icons[step.icon as keyof typeof icons];
              return (
                <li key={step.title} className="relative">
                  <Reveal delay={i * 0.1} className="flex flex-col">
                    <div className="flex items-end gap-2.5">
                      <div className="flex size-20 items-center justify-center rounded-full border border-bronze/50 bg-cream">
                        <Icon size={30} weight="thin" className="text-bronze" />
                      </div>
                      <span
                        className="font-display text-lg text-bronze-text"
                        aria-hidden="true"
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <h3 className="mt-7 text-base font-semibold text-ink">
                      {step.title}
                    </h3>
                    <p className="mt-3 max-w-[26ch] text-sm leading-relaxed text-ink-soft">
                      {step.description}
                    </p>
                  </Reveal>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
