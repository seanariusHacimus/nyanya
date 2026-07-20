import { ShieldCheck, Gauge, ChatsCircle } from "@phosphor-icons/react/dist/ssr";
import { trustFeatures } from "@/content/home";
import { Reveal } from "@/components/reveal";

const icons = {
  shield: ShieldCheck,
  gauge: Gauge,
  chat: ChatsCircle,
} as const;

export function TrustFeatures() {
  return (
    <section>
      <div className="mx-auto grid max-w-[1400px] gap-12 px-5 py-24 sm:px-8 lg:py-32 xl:grid-cols-[1fr_2fr] xl:gap-20">
        <Reveal>
          <h2 className="max-w-[14ch] font-display text-4xl leading-[1.12] font-medium text-ink sm:text-5xl">
            {trustFeatures.title}
          </h2>
        </Reveal>

        <div className="grid gap-10 md:grid-cols-3 md:gap-0">
          {trustFeatures.features.map((feature, i) => {
            const Icon = icons[feature.icon as keyof typeof icons];
            return (
              <Reveal
                key={feature.title}
                delay={i * 0.1}
                className={
                  i > 0
                    ? "md:border-l md:border-line md:px-8 xl:px-10"
                    : "md:pr-8 xl:pr-10"
                }
              >
                <Icon size={36} weight="thin" className="text-bronze" />
                <h3 className="mt-6 text-base font-semibold text-ink">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                  {feature.description}
                </p>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
