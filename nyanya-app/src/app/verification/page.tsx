import Link from "next/link";
import {
  FileArrowUp,
  UserFocus,
  SealCheck,
  ShieldCheck,
  Star,
} from "@phosphor-icons/react/dist/ssr";
import { PageHero } from "@/components/ui/page-hero";
import { ButtonLink } from "@/components/ui/button-link";
import { TrustScore } from "@/components/ui/trust-score";
import { Reveal } from "@/components/reveal";

export const metadata = {
  title: "Проверка специалистов",
  description:
    "Каждая анкета на nyanya.uz проходит проверку модератором до публикации: паспорт, медицинские справки, дипломы и рекомендации.",
};

// §14 V2 — этапы проверки
const stages = [
  {
    icon: FileArrowUp,
    title: "Анкета и документы",
    text: "Специалист загружает паспорт, справки и сертификаты.",
  },
  {
    icon: UserFocus,
    title: "Проверка модератором",
    text: "Документы и данные анкеты сверяются вручную.",
  },
  {
    icon: SealCheck,
    title: "Публикация со статусом",
    text: "Анкета получает бейдж и индекс доверия.",
  },
];

// §14 V3 — документы по категориям
const docsByCategory = [
  { category: "Няня", docs: "Паспорт · медицинские справки (терапевт, психиатр, анализы)" },
  { category: "Сиделка", docs: "Паспорт · медицинские справки" },
  { category: "Репетитор", docs: "Паспорт · дипломы и сертификаты (рекомендуется)" },
  { category: "Водитель", docs: "Паспорт · водительское удостоверение" },
];

export default function VerificationPage() {
  return (
    <main className="flex-1">
      <PageHero
        title="Как мы проверяем специалистов"
        subtitle="Каждая анкета проходит проверку модератором до публикации."
      />

      {/* V2 — этапы (таймлайн) */}
      <section className="mx-auto max-w-[1400px] px-5 py-16 sm:px-8 lg:py-24">
        <ol className="grid gap-10 sm:grid-cols-3 sm:gap-8">
          {stages.map((stage, i) => (
            <li key={stage.title}>
              <Reveal delay={i * 0.08}>
                <div className="flex items-end gap-2.5">
                  <div className="flex size-20 items-center justify-center rounded-full border border-bronze/50 bg-cream">
                    <stage.icon size={30} weight="thin" className="text-bronze" />
                  </div>
                  <span
                    className="font-display text-lg text-bronze-text"
                    aria-hidden="true"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h2 className="mt-7 text-base font-semibold text-ink">
                  {stage.title}
                </h2>
                <p className="mt-3 max-w-[30ch] text-sm leading-relaxed text-ink-soft">
                  {stage.text}
                </p>
              </Reveal>
            </li>
          ))}
        </ol>
        <Reveal>
          <p className="mt-10 text-sm text-ink-soft">
            Изменения в анкете проходят повторную проверку.
          </p>
        </Reveal>
      </section>

      {/* V3 — документы по категориям */}
      <section className="mx-auto max-w-[1400px] px-5 sm:px-8">
        <Reveal>
          <div className="rounded-[2px] bg-cream-deep px-8 py-14 sm:px-12 lg:px-14">
            <h2 className="max-w-md font-display text-3xl leading-[1.12] font-medium text-ink sm:text-4xl">
              Какие документы проверяются
            </h2>
            <dl className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {docsByCategory.map((row) => (
                <div key={row.category} className="border-l border-bronze/40 pl-6">
                  <dt className="text-base font-semibold text-ink">
                    {row.category}
                  </dt>
                  <dd className="mt-2 text-sm leading-relaxed text-ink-soft">
                    {row.docs}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-10 text-sm text-ink-soft">
              Рекомендации предыдущих семей — по желанию, для всех категорий.
            </p>
          </div>
        </Reveal>
      </section>

      {/* V4 — уровни проверки */}
      <section className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 lg:py-28">
        <Reveal className="grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-20">
          <h2 className="max-w-[12ch] font-display text-3xl leading-[1.12] font-medium text-ink sm:text-4xl">
            Уровни проверки
          </h2>
          <div className="grid gap-10 sm:grid-cols-2 sm:gap-0">
            <div className="sm:pr-8 lg:pr-10">
              <ShieldCheck size={36} weight="thin" className="text-bronze" />
              <h3 className="mt-6 text-base font-semibold text-ink">Проверен</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                Личность и обязательные документы подтверждены модератором.
              </p>
            </div>
            <div className="sm:border-l sm:border-line sm:px-8 lg:px-10">
              <Star size={36} weight="thin" className="text-bronze" />
              <h3 className="mt-6 text-base font-semibold text-ink">
                Премиум-проверка
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                Полный пакет документов и рекомендации предыдущих семей.
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* V5 — индекс доверия (единая формулировка с §6.5) */}
      <section className="mx-auto max-w-[1400px] px-5 sm:px-8">
        <Reveal>
          <div className="grid items-center gap-10 rounded-[2px] bg-cream-deep px-8 py-14 sm:px-12 lg:grid-cols-[auto_1fr] lg:gap-16 lg:px-14">
            <TrustScore score={84} size="lg" className="mx-auto lg:mx-0" />
            <div>
              <h2 className="max-w-md font-display text-3xl leading-[1.12] font-medium text-ink sm:text-4xl">
                Индекс доверия
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-soft">
                Каждый специалист получает индекс от 0 до 100. На него влияют:
                проверка документов, обращения семей, срок работы на платформе,
                отзывы и оценки. Индекс пересчитывается автоматически.
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* V6 — честные границы */}
      <section className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 lg:py-28">
        <Reveal>
          <p className="mx-auto max-w-2xl text-center text-lg leading-relaxed text-ink-soft">
            Мы проверяем документы и личность. Решение о найме принимаете вы:
            познакомьтесь лично, проведите собеседование, обсудите условия.
          </p>
        </Reveal>
      </section>

      {/* V7 — двойной CTA */}
      <section className="mx-auto max-w-[1400px] px-5 pb-24 text-center sm:px-8 lg:pb-32">
        <Reveal>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-5">
            <ButtonLink href="/catalog">Перейти в каталог</ButtonLink>
            <Link
              href="/become-specialist"
              className="label-caps border-b border-ink/30 pb-1 text-ink transition-colors duration-300 hover:border-bronze hover:text-bronze-text"
            >
              Разместить анкету
            </Link>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
