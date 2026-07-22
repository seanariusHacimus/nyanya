import Link from "next/link";
import { ShieldCheck, Gauge, ChatsCircle } from "@phosphor-icons/react/dist/ssr";
import { trustFeatures } from "@/content/home";
import { specialists, districts } from "@/content/specialists";
import { PageHero } from "@/components/ui/page-hero";
import { ButtonLink } from "@/components/ui/button-link";
import { Reveal } from "@/components/reveal";

export const metadata = {
  title: "О сервисе",
  description:
    "nyanya.uz — премиальный сервис подбора проверенных специалистов для семьи в Ташкенте: няни, сиделки, репетиторы и водители.",
};

const icons = {
  shield: ShieldCheck,
  gauge: Gauge,
  chat: ChatsCircle,
} as const;

// §18 O3 — только реальные цифры (дисциплина D3)
const numbers = [
  { value: "4", label: "категории специалистов" },
  { value: String(districts.length), label: "районов Ташкента" },
  { value: String(specialists.length), label: "анкет в каталоге" },
];

export default function AboutPage() {
  return (
    <main className="flex-1">
      <PageHero title="О сервисе" />

      {/* O1 — миссия */}
      <section className="mx-auto max-w-[1400px] px-5 pt-6 sm:px-8">
        <Reveal>
          <p className="max-w-3xl font-display text-2xl leading-snug font-medium text-ink sm:text-3xl">
            Мы создали nyanya.uz, потому что поиск человека, которому вы доверите
            дом и близких, не должен происходить среди объявлений. Мы проверяем
            специалистов до публикации — вы выбираете спокойно.
          </p>
        </Reveal>
      </section>

      {/* O2 — принципы (единая формулировка с B6 главной) */}
      <section className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 lg:py-28">
        <Reveal className="grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-20">
          <h2 className="max-w-[12ch] font-display text-3xl leading-[1.12] font-medium text-ink sm:text-4xl">
            Наши принципы
          </h2>
          <div className="grid gap-10 md:grid-cols-3 md:gap-0">
            {trustFeatures.features.map((feature, i) => {
              const Icon = icons[feature.icon as keyof typeof icons];
              return (
                <div
                  key={feature.title}
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
                </div>
              );
            })}
          </div>
        </Reveal>
      </section>

      {/* O3 — цифры */}
      <section className="mx-auto max-w-[1400px] px-5 sm:px-8">
        <Reveal>
          <dl className="grid gap-10 rounded-[2px] bg-cream-deep px-8 py-14 text-center sm:grid-cols-3 sm:px-12">
            {numbers.map((n) => (
              <div key={n.label}>
                <dd className="font-display text-5xl font-medium text-ink">
                  {n.value}
                </dd>
                <dt className="mt-3 text-sm text-ink-soft">{n.label}</dt>
              </div>
            ))}
          </dl>
        </Reveal>
      </section>

      {/* O5 — двойной CTA (D35: бренд без лиц, блок команды не показываем) */}
      <section className="mx-auto max-w-[1400px] px-5 py-24 text-center sm:px-8 lg:py-32">
        <Reveal>
          <h2 className="font-display text-3xl leading-[1.12] font-medium text-ink sm:text-4xl">
            Познакомьтесь с каталогом
          </h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-5">
            <ButtonLink href="/catalog">Перейти в каталог</ButtonLink>
            <Link
              href="/become-specialist"
              className="label-caps border-b border-ink/30 pb-1 text-ink transition-colors duration-300 hover:border-bronze hover:text-bronze-text"
            >
              Стать специалистом
            </Link>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
