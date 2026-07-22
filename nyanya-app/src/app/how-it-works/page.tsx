import Link from "next/link";
import {
  SquaresFour,
  MagnifyingGlass,
  LockKeyOpen,
  Handshake,
  IdentificationCard,
  FirstAid,
  GraduationCap,
  EnvelopeSimple,
  CurrencyCircleDollar,
  Infinity as InfinityIcon,
  ChatsCircle,
  ArrowRight,
} from "@phosphor-icons/react/dist/ssr";
import { PageHero } from "@/components/ui/page-hero";
import { Accordion } from "@/components/ui/accordion";
import { ButtonLink } from "@/components/ui/button-link";
import { TrustScore } from "@/components/ui/trust-score";
import { Reveal } from "@/components/reveal";

export const metadata = {
  title: "Как это работает",
  description:
    "От выбора категории до первого рабочего дня — весь путь прозрачен. Как устроен подбор проверенных специалистов на nyanya.uz.",
};

// §6.3 — шаги, self-serve (D1)
const steps = [
  {
    icon: SquaresFour,
    title: "Выберите категорию",
    text: "Няня, сиделка, репетитор или водитель — каждая категория ведёт в каталог с нужным фильтром.",
  },
  {
    icon: MagnifyingGlass,
    title: "Изучите анкеты",
    text: "Фильтры по району, цене и опыту. Индекс доверия и отзывы помогают сравнить и выбрать.",
  },
  {
    icon: LockKeyOpen,
    title: "Откройте контакты",
    text: "Разовая оплата открывает телефон, Telegram и WhatsApp специалиста — навсегда, в вашем кабинете.",
  },
  {
    icon: Handshake,
    title: "Начните сотрудничество",
    text: "Договаривайтесь напрямую: график, условия и оплату работы вы обсуждаете со специалистом без посредников.",
  },
];

// §6.4 — что мы проверяем
const checks = [
  {
    icon: IdentificationCard,
    title: "Паспорт",
    text: "Личность каждого специалиста подтверждена.",
  },
  {
    icon: FirstAid,
    title: "Медицинские справки",
    text: "Терапевт, психиатр, анализы; обязательны для нянь и сиделок.",
  },
  {
    icon: GraduationCap,
    title: "Дипломы и сертификаты",
    text: "Образование и квалификация.",
  },
  {
    icon: EnvelopeSimple,
    title: "Рекомендации",
    text: "Предыдущие семьи и работодатели.",
  },
];

// §6.6 — что происходит после оплаты (D19: цену публикуем)
const afterPayment = [
  {
    icon: CurrencyCircleDollar,
    text: "Оплата разовая — 29 000 сум за одного специалиста.",
  },
  {
    icon: InfinityIcon,
    text: "Контакты остаются доступны навсегда в вашем кабинете.",
  },
  {
    icon: ChatsCircle,
    text: "Вы общаетесь напрямую — телефон, Telegram, WhatsApp.",
  },
];

// §6.7 — мини-FAQ (подмножество §16)
const faq = [
  {
    q: "Сколько стоит открытие контактов?",
    a: "29 000 сум за одного специалиста. Оплата разовая — контакты остаются доступны в вашем кабинете навсегда.",
  },
  {
    q: "Оплата разовая или подписка?",
    a: "Разовая. Никаких подписок и скрытых списаний: один платёж — один специалист, доступ навсегда.",
  },
  {
    q: "Как проверяются специалисты?",
    a: "Модератор вручную сверяет паспорт, медицинские справки, дипломы и рекомендации до публикации анкеты в каталоге.",
  },
  {
    q: "Что делать, если специалист не подошёл?",
    a: "Вернитесь в каталог и выберите другого — фильтры и индекс доверия помогут сузить поиск. Решение о найме всегда остаётся за вами.",
  },
  {
    q: "Кто отвечает за качество работы?",
    a: "nyanya.uz — платформа для поиска и проверки документов. Условия работы вы согласуете со специалистом напрямую, поэтому финальное решение и контроль — за вами.",
  },
  {
    q: "Можно ли оставить отзыв?",
    a: "Да, после открытия контактов вы сможете оценить сотрудничество — отзывы влияют на индекс доверия специалиста.",
  },
];

export default function HowItWorksPage() {
  return (
    <main className="flex-1">
      <PageHero
        title="Как это работает"
        subtitle="От выбора категории до первого рабочего дня — весь путь прозрачен."
      />

      {/* §6.3 — шаги, развёрнуто */}
      <section className="mx-auto max-w-[1400px] px-5 py-16 sm:px-8 lg:py-24">
        <ol className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {steps.map((step, i) => (
            <li key={step.title}>
              <Reveal delay={i * 0.08} className="flex h-full flex-col">
                <div className="flex items-end gap-2.5">
                  <div className="flex size-20 items-center justify-center rounded-full border border-bronze/50 bg-cream">
                    <step.icon size={30} weight="thin" className="text-bronze" />
                  </div>
                  <span
                    className="font-display text-lg text-bronze-text"
                    aria-hidden="true"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h2 className="mt-7 text-base font-semibold text-ink">
                  {step.title}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                  {step.text}
                </p>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      {/* §6.4 — что мы проверяем */}
      <section className="mx-auto max-w-[1400px] px-5 sm:px-8">
        <Reveal>
          <div className="rounded-[2px] bg-cream-deep px-8 py-14 sm:px-12 lg:px-14">
            <h2 className="max-w-md font-display text-3xl leading-[1.12] font-medium text-ink sm:text-4xl">
              Что мы проверяем
            </h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {checks.map((check) => (
                <div key={check.title}>
                  <check.icon size={32} weight="thin" className="text-bronze" />
                  <h3 className="mt-4 text-base font-semibold text-ink">
                    {check.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                    {check.text}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-10 text-sm text-ink-soft">
              Анкета публикуется в каталоге только после проверки модератором.{" "}
              <Link
                href="/verification"
                className="border-b border-ink/30 pb-0.5 font-medium text-ink transition-colors duration-300 hover:border-bronze hover:text-bronze-text"
              >
                Подробнее о проверке специалистов
              </Link>
            </p>
          </div>
        </Reveal>
      </section>

      {/* §6.5 — индекс доверия */}
      <section className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 lg:py-28">
        <Reveal className="grid items-center gap-10 lg:grid-cols-[auto_1fr] lg:gap-16">
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
        </Reveal>
      </section>

      {/* §6.6 — что происходит после оплаты */}
      <section className="mx-auto max-w-[1400px] px-5 sm:px-8">
        <Reveal>
          <div className="rounded-[2px] bg-charcoal px-8 py-14 text-cream sm:px-12 lg:px-14">
            <h2 className="max-w-md font-display text-3xl leading-[1.12] font-medium sm:text-4xl">
              Что происходит после оплаты
            </h2>
            <ul className="mt-10 grid gap-8 sm:grid-cols-3">
              {afterPayment.map((point) => (
                <li key={point.text}>
                  <point.icon
                    size={32}
                    weight="thin"
                    className="text-bronze-soft"
                  />
                  <p className="mt-4 text-sm leading-relaxed text-cream/80">
                    {point.text}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-10 border-t border-cream/10 pt-6 text-sm leading-relaxed text-cream/60">
              nyanya.uz — платформа для поиска и проверки. Условия работы и оплату
              труда вы согласуете со специалистом самостоятельно.
            </p>
          </div>
        </Reveal>
      </section>

      {/* §6.7 — мини-FAQ */}
      <section className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 lg:py-28">
        <Reveal className="grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-20">
          <h2 className="max-w-[14ch] font-display text-3xl leading-[1.12] font-medium text-ink sm:text-4xl">
            Частые вопросы
          </h2>
          <div>
            <Accordion items={faq} />
            <Link
              href="/faq"
              className="label-caps group mt-8 inline-flex items-center gap-3 text-ink transition-colors duration-300 hover:text-bronze-text"
            >
              <span className="border-b border-ink/30 pb-1 transition-colors duration-300 group-hover:border-bronze">
                Все вопросы и ответы
              </span>
              <ArrowRight
                size={14}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </Link>
          </div>
        </Reveal>
      </section>

      {/* §6.8 — финальный CTA */}
      <section className="mx-auto max-w-[1400px] px-5 pb-24 text-center sm:px-8 lg:pb-32">
        <Reveal>
          <h2 className="font-display text-3xl leading-[1.12] font-medium text-ink sm:text-4xl">
            Готовы найти специалиста?
          </h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-5">
            <ButtonLink href="/catalog">Перейти в каталог</ButtonLink>
            <Link
              href="/become-specialist"
              className="label-caps border-b border-ink/30 pb-1 text-ink transition-colors duration-300 hover:border-bronze hover:text-bronze-text"
            >
              Вы специалист? Разместите анкету
            </Link>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
