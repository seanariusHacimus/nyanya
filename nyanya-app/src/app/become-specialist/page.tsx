import Image from "next/image";
import Link from "next/link";
import {
  Storefront,
  SealCheck,
  PhoneCall,
  Gauge,
  UserPlus,
  PencilSimpleLine,
  ShieldCheck,
  Bell,
  IdentificationCard,
  FirstAid,
  GraduationCap,
  EnvelopeSimple,
} from "@phosphor-icons/react/dist/ssr";
import { getSpecialist } from "@/content/specialists";
import { SpecialistCard } from "@/components/specialist-card";
import { ButtonLink } from "@/components/ui/button-link";
import { Accordion } from "@/components/ui/accordion";
import { Reveal } from "@/components/reveal";
import specialistHero from "../../../public/images/specialist-hero.jpg";

export const metadata = {
  title: "Специалистам",
  description:
    "Разместите анкету на nyanya.uz — премиальной платформе проверенных специалистов Ташкента. Размещение бесплатно, семьи связываются с вами напрямую.",
};

// §7.3 — что вы получаете
const benefits = [
  {
    icon: Storefront,
    title: "Достойная витрина",
    text: "Премиальная анкета с фото и отзывами. Ваш профессиональный профиль, а не объявление.",
  },
  {
    icon: SealCheck,
    title: "Статус «Проверен»",
    text: "Проверка документов выделяет вас среди объявлений и оправдывает достойную цену.",
  },
  {
    icon: PhoneCall,
    title: "Прямые обращения",
    text: "Семьи платят платформе за ваши контакты и звонят напрямую. Мы не берём процент с вашей работы.",
  },
  {
    icon: Gauge,
    title: "Индекс доверия",
    text: "Растёт с опытом, обращениями и отзывами — и поднимает анкету выше в каталоге.",
  },
];

// §7.4 — как разместить анкету
const steps = [
  {
    icon: UserPlus,
    title: "Зарегистрируйтесь",
    text: "Аккаунт специалиста и подтверждение телефона — 2 минуты.",
  },
  {
    icon: PencilSimpleLine,
    title: "Заполните анкету",
    text: "Опыт, образование, цена и фото.",
  },
  {
    icon: ShieldCheck,
    title: "Пройдите проверку",
    text: "Загрузите документы — модератор проверит анкету обычно за 1–2 рабочих дня.",
  },
  {
    icon: Bell,
    title: "Получайте обращения",
    text: "Анкета в каталоге; когда семья открывает контакты — приходит уведомление.",
  },
];

// §7.5 — какие документы нужны
const documents = [
  { icon: IdentificationCard, title: "Паспорт", text: "Для всех специалистов." },
  { icon: FirstAid, title: "Медицинские справки", text: "Для нянь и сиделок." },
  {
    icon: GraduationCap,
    title: "Дипломы и сертификаты",
    text: "Подтверждают квалификацию.",
  },
  {
    icon: EnvelopeSimple,
    title: "Рекомендации",
    text: "По желанию, повышают доверие.",
  },
];

// §7.7 — диапазоны заработка (D23: публикуем, данные из каталога)
const earnings = [
  { category: "Няни", range: "22 000–45 000 сум/час" },
  { category: "Репетиторы", range: "до 70 000 сум/час" },
  { category: "Сиделки", range: "350 000–400 000 сум/день" },
  { category: "Водители", range: "25 000–35 000 сум/час" },
];

// §7.9 — FAQ для специалистов
const faq = [
  {
    q: "Сколько стоит размещение?",
    a: "Бесплатно. Платформа зарабатывает только на открытии контактов семьями — с вашей работы мы не берём ничего.",
  },
  {
    q: "Как долго идёт проверка?",
    a: "Обычно 1–2 рабочих дня после загрузки всех документов.",
  },
  {
    q: "Кто видит мои контакты?",
    a: "Только семьи, оплатившие доступ. В открытой части анкеты телефона и мессенджеров нет.",
  },
  {
    q: "Можно ли скрыть анкету на время?",
    a: "Да — напишите в поддержку, и мы временно скроем анкету. Самостоятельное скрытие появится в кабинете.",
  },
  {
    q: "Как повысить индекс доверия?",
    a: "Полный пакет документов, заполненная анкета, рекомендации и отзывы семей — индекс растёт автоматически.",
  },
  {
    q: "Что делать при отклонении анкеты?",
    a: "В кабинете будет указана конкретная причина. Исправьте её и отправьте анкету снова — повторная проверка бесплатна.",
  },
];

export default function BecomeSpecialistPage() {
  const example = getSpecialist("sevara-toshpulatova");

  return (
    <main className="flex-1">
      {/* S1 — герой */}
      <section className="mx-auto max-w-[1400px] px-5 sm:px-8">
        <div className="grid items-center gap-12 pt-10 pb-16 lg:grid-cols-2 lg:gap-10 lg:pt-16 lg:pb-24">
          <div className="max-w-xl">
            <p className="label-caps text-bronze-text">
              Для нянь · сиделок · репетиторов · водителей
            </p>
            <h1 className="mt-6 font-display text-[2.75rem] leading-[1.06] font-medium tracking-[-0.01em] text-ink sm:text-5xl xl:text-6xl">
              Работайте с семьями, которые вам доверяют
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-soft">
              Разместите анкету на nyanya.uz — премиальной платформе проверенных
              специалистов Ташкента. Семьи платят за доступ к вашим контактам и
              связываются с вами напрямую.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-5">
              <ButtonLink href="/register">Разместить анкету</ButtonLink>
              <Link
                href="/verification"
                className="label-caps border-b border-ink/30 pb-1 text-ink transition-colors duration-300 hover:border-bronze hover:text-bronze-text"
              >
                Как проходит проверка
              </Link>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[380px] lg:max-w-[440px]">
            <Image
              src={specialistHero}
              alt="Профессиональная няня в светлой гостиной"
              preload
              placeholder="blur"
              sizes="(max-width: 1024px) 80vw, 440px"
              className="hero-mask h-auto w-full"
            />
          </div>
        </div>
      </section>

      {/* S2 — что вы получаете */}
      <section className="mx-auto max-w-[1400px] px-5 sm:px-8">
        <Reveal>
          <div className="rounded-[2px] bg-cream-deep px-8 py-14 sm:px-12 lg:px-14">
            <h2 className="max-w-md font-display text-3xl leading-[1.12] font-medium text-ink sm:text-4xl">
              Что вы получаете
            </h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {benefits.map((b) => (
                <div key={b.title}>
                  <b.icon size={32} weight="thin" className="text-bronze" />
                  <h3 className="mt-4 text-base font-semibold text-ink">{b.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                    {b.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* S3 — как разместить анкету */}
      <section className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 lg:py-28">
        <Reveal>
          <h2 className="max-w-md font-display text-3xl leading-[1.12] font-medium text-ink sm:text-4xl">
            Как разместить анкету
          </h2>
        </Reveal>
        <ol className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {steps.map((step, i) => (
            <li key={step.title}>
              <Reveal delay={i * 0.08}>
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
                <h3 className="mt-7 text-base font-semibold text-ink">
                  {step.title}
                </h3>
                <p className="mt-3 max-w-[28ch] text-sm leading-relaxed text-ink-soft">
                  {step.text}
                </p>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      {/* S4 + S5 — документы и пример анкеты */}
      <section className="mx-auto grid max-w-[1400px] gap-14 px-5 sm:px-8 lg:grid-cols-2 lg:gap-20">
        <Reveal>
          <h2 className="max-w-md font-display text-3xl leading-[1.12] font-medium text-ink sm:text-4xl">
            Какие документы нужны
          </h2>
          <ul className="mt-10 space-y-7">
            {documents.map((doc) => (
              <li key={doc.title} className="flex gap-5">
                <doc.icon
                  size={28}
                  weight="thin"
                  className="mt-0.5 shrink-0 text-bronze"
                />
                <div>
                  <h3 className="text-base font-semibold text-ink">{doc.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                    {doc.text}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <Link
            href="/verification"
            className="label-caps mt-10 inline-block border-b border-ink/30 pb-1 text-ink transition-colors duration-300 hover:border-bronze hover:text-bronze-text"
          >
            Подробнее о проверке
          </Link>
        </Reveal>

        {example && (
          <Reveal delay={0.1}>
            <div className="rounded-[2px] bg-cream-deep p-8 sm:p-10">
              <h2 className="font-display text-2xl font-medium text-ink">
                Так выглядит ваша анкета
              </h2>
              <div className="mx-auto mt-8 max-w-[340px]">
                <SpecialistCard specialist={example} />
              </div>
              <p className="mt-6 text-center text-sm text-ink-soft">
                Анкета с проверкой получает индекс доверия и место в каталоге.
              </p>
            </div>
          </Reveal>
        )}
      </section>

      {/* S6 — сколько зарабатывают (D23) */}
      <section className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 lg:py-28">
        <Reveal className="grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-20">
          <h2 className="max-w-[14ch] font-display text-3xl leading-[1.12] font-medium text-ink sm:text-4xl">
            Сколько зарабатывают специалисты
          </h2>
          <div>
            <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {earnings.map((row) => (
                <div key={row.category} className="border-l border-bronze/40 pl-6">
                  <dt className="label-caps text-ink-faint">{row.category}</dt>
                  <dd className="mt-2 font-display text-xl font-medium text-ink">
                    {row.range}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-8 text-sm text-ink-soft">Цену вы устанавливаете сами.</p>
          </div>
        </Reveal>
      </section>

      {/* S7 — условия размещения (⛳ D22: бесплатно) */}
      <section className="mx-auto max-w-[1400px] px-5 sm:px-8">
        <Reveal>
          <div className="rounded-[2px] bg-charcoal px-8 py-14 text-center sm:px-12">
            <p className="mx-auto max-w-2xl font-display text-2xl leading-snug font-medium text-cream sm:text-3xl">
              Размещение анкеты — бесплатно.
            </p>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-cream/70">
              Платформа зарабатывает только на открытии контактов. Мы не берём
              процент с вашей работы.
            </p>
          </div>
        </Reveal>
      </section>

      {/* S8 — FAQ */}
      <section className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 lg:py-28">
        <Reveal className="grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-20">
          <h2 className="max-w-[14ch] font-display text-3xl leading-[1.12] font-medium text-ink sm:text-4xl">
            Вопросы специалистов
          </h2>
          <Accordion items={faq} />
        </Reveal>
      </section>

      {/* S9 — финальный CTA */}
      <section className="mx-auto max-w-[1400px] px-5 pb-24 text-center sm:px-8 lg:pb-32">
        <Reveal>
          <h2 className="font-display text-3xl leading-[1.12] font-medium text-ink sm:text-4xl">
            Готовы начать?
          </h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-5">
            <ButtonLink href="/register">Разместить анкету</ButtonLink>
            <Link
              href="/contacts"
              className="label-caps border-b border-ink/30 pb-1 text-ink transition-colors duration-300 hover:border-bronze hover:text-bronze-text"
            >
              Остались вопросы? Напишите нам
            </Link>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
