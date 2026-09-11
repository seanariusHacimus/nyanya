import Link from "next/link";
import {
  FileArrowUp,
  UserFocus,
  SealCheck,
  IdentificationCard,
  Star,
} from "@phosphor-icons/react/dist/ssr";
import { PageHero } from "@/components/ui/page-hero";
import { ButtonLink } from "@/components/ui/button-link";
import { Reveal } from "@/components/reveal";

export const metadata = {
  title: "Как разместить анкету",
  description:
    "Три шага: заполнить анкету, пройти модерацию, опубликоваться. Документы специалист добавляет по желанию.",
};

// §14 V2 — как разместить анкету (тексты владельца, 2026-09-11)
const stages = [
  {
    icon: FileArrowUp,
    title: "Заполнение анкеты",
    text: "Специалист указывает информацию о себе, опыт работы, район проживания и желаемую оплату.",
  },
  {
    icon: UserFocus,
    title: "Модерация анкеты",
    text: "Анкета проверяется на соответствие правилам платформы.",
  },
  {
    icon: SealCheck,
    title: "Публикация анкеты",
    text: "После модерации анкета становится доступна работодателям на сайте.",
  },
];

/**
 * §14 V3 — дополнительные документы. Список задан владельцем как обещание
 * семье о том, что может быть в анкете; загрузка всего этого добровольна.
 */
const extraDocuments = [
  "Паспорт или ID-карту",
  "Медицинские справки",
  "Сертификаты и дипломы",
  "Рекомендательные письма",
  "Справку об отсутствии судимости",
  "Водительское удостоверение (для водителей)",
];

export default function VerificationPage() {
  return (
    <main className="flex-1">
      <PageHero title="Как разместить анкету на nyanya.uz" />

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
      </section>

      {/* V3 — дополнительные документы */}
      <section className="mx-auto max-w-[1400px] px-5 sm:px-8">
        <Reveal>
          <div className="rounded-[2px] bg-cream-deep px-8 py-14 sm:px-12 lg:px-14">
            <h2 className="max-w-md font-display text-3xl leading-[1.12] font-medium text-ink sm:text-4xl">
              Дополнительные документы специалиста
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-soft">
              Специалист может по своему желанию загрузить дополнительные
              документы и рекомендации для повышения доверия работодателей.
            </p>

            <p className="label-caps mt-10 text-bronze-text">Можно добавить</p>
            <ul className="mt-5 grid gap-4 sm:grid-cols-2">
              {extraDocuments.map((doc) => (
                <li key={doc} className="border-l border-bronze/40 pl-6">
                  <p className="text-base text-ink">{doc}</p>
                </li>
              ))}
            </ul>

            <p className="mt-10 max-w-xl text-sm leading-relaxed text-ink-soft">
              Загрузка документов является добровольной. Специалисты, добавившие
              дополнительные документы, могут получить статус «Премиум-профиль».
            </p>
          </div>
        </Reveal>
      </section>

      {/* V4 — уровни проверки */}
      <section className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 lg:py-28">
        <Reveal className="grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-20">
          <h2 className="max-w-[12ch] font-display text-3xl leading-[1.12] font-medium text-ink sm:text-4xl">
            Два вида профиля
          </h2>
          <div className="grid gap-10 sm:grid-cols-2 sm:gap-0">
            <div className="sm:pr-8 lg:pr-10">
              <IdentificationCard size={36} weight="thin" className="text-bronze" />
              <h3 className="mt-6 text-base font-semibold text-ink">
                Стандартный профиль
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                Анкета заполнена, фотография принята модератором. Документы
                специалист не предоставлял.
              </p>
            </div>
            <div className="sm:border-l sm:border-line sm:px-8 lg:px-10">
              <Star size={36} weight="thin" className="text-bronze" />
              <h3 className="mt-6 text-base font-semibold text-ink">
                Премиум-профиль
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                Специалист предоставил полный пакет документов, и модератор их
                принял.
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* V6 — честные границы */}
      <section className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 lg:py-28">
        <Reveal>
          <p className="mx-auto max-w-2xl text-center text-lg leading-relaxed text-ink-soft">
            Мы проверяем документы и данные специалиста. Окончательное решение
            о сотрудничестве принимаете вы после личного общения, собеседования
            и обсуждения условий работы.
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
