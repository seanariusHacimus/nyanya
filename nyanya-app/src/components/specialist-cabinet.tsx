"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Circle,
  HourglassMedium,
  CheckCircle,
  WarningCircle,
  Eye,
  EyeSlash,
  PhoneCall,
  Star,
  SignOut,
} from "@phosphor-icons/react";
import { authClient } from "@/lib/auth-client";
import {
  NotificationHeading,
  NotificationList,
} from "@/components/notification-list";
import type { CabinetData, CabinetProfile } from "@/lib/queries/specialist-cabinet";
import { setAvailability } from "@/lib/actions/specialist-profile";
import {
  ProfileWizard,
  type WizardScope,
} from "@/components/specialist/profile-wizard";
import type { StepState } from "@/components/specialist/verification-step-card";

const banners = {
  draft: {
    icon: Circle,
    title: "Черновик",
    text: "Заполните анкету и загрузите фотографию — этого достаточно, чтобы отправить её на проверку. Остальные документы можно догрузить позже.",
    box: "border-line bg-paper",
  },
  pending_review: {
    icon: HourglassMedium,
    title: "На проверке",
    text: "Анкета и документы у модератора. Обычно проверка занимает 1–2 рабочих дня — мы сообщим о результате.",
    box: "border-bronze/50 bg-cream-deep",
  },
  active: {
    icon: CheckCircle,
    title: "Опубликована",
    text: "Анкета в каталоге: семьи видят её и могут открыть ваши контакты.",
    box: "border-bronze bg-cream-deep",
  },
  rejected: {
    icon: WarningCircle,
    title: "Требуются исправления",
    text: "Модератор вернул анкету на доработку. Исправьте отмеченное и отправьте повторно.",
    box: "border-[#a5462f]/50 bg-[#a5462f]/5",
  },
  hidden: {
    icon: EyeSlash,
    title: "Скрыта",
    text: "Анкета временно не отображается в каталоге. Напишите в поддержку, если это неожиданно.",
    box: "border-line bg-paper",
  },
} as const;

/**
 * Шаги заполнения. Поля сгруппированы так, чтобы каждый шаг отвечал на один
 * вопрос семьи: кто вы, где и почём, что умеете, какой вы, чем это
 * подтверждено. Порядок — от самого простого к самому трудоёмкому: человек
 * успевает почувствовать движение до того, как дойдёт до сбора справок.
 */
const WIZARD_CHECKS = [
  { key: "who", label: "ФИО и дата рождения" },
  { key: "where", label: "Район и стоимость" },
  { key: "experience", label: "Опыт и навыки" },
  { key: "about", label: "Рассказ о себе" },
  { key: "documents", label: "Фотография" },
] as const;

type WizardKey = (typeof WIZARD_CHECKS)[number]["key"];

/**
 * Пройден ли шаг — считаем по данным, а не по тому, нажимал ли человек
 * «Далее»: после перезагрузки страницы все шаги снова выглядели бы пустыми.
 */
function computeStepDone(
  profile: CabinetProfile,
  documentsReady: boolean
): Record<WizardKey, boolean> {
  return {
    who: profile.fullName.trim().length > 1 && Boolean(profile.birthDate),
    where: Boolean(profile.districtId) && profile.priceAmount > 0,
    // шаг необязательный: пройден, если человек рассказал о себе хоть что-то
    experience:
      profile.experienceYears > 0 ||
      profile.education.trim().length > 0 ||
      profile.languages.length > 0 ||
      profile.hasCar ||
      profile.liveIn ||
      profile.nightAvailable ||
      profile.newbornExp,
    about: profile.description.trim().length > 0,
    documents: documentsReady,
  };
}

export function SpecialistCabinet({
  name,
  data,
  startWizard = false,
}: {
  name: string;
  data: CabinetData;
  /** Открыть анкету сразу — так приходят с регистрации, кабинету пока нечего показать. */
  startWizard?: boolean;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState<CabinetProfile>(data.profile);
  // состояние шагов держим локально: загрузка обновляет его мгновенно,
  // сервер остаётся источником правды при следующей загрузке страницы
  const [steps, setSteps] = useState<Record<string, StepState>>(data.steps);
  /**
   * Какой поток открыт. Анкета (с фотографией и отправкой внутри) и документы
   * для премиума разведены намеренно: вместе они давали «шаг 1 из 17», а
   * собирают их в разные дни.
   */
  const [wizard, setWizard] = useState<WizardScope | null>(
    startWizard ? "profile" : null
  );
  const [availabilityPending, startAvailability] = useTransition();

  const locked = data.status === "pending_review";
  const banner = banners[data.status];
  const BannerIcon = banner.icon;

  /**
   * Отправить анкету можно с одной фотографией — тот же минимум, что и у
   * публикации. Остальные документы поднимают её до «Премиум-профиля».
   */
  const photoReady = steps["profile_photo"]?.status !== "empty";

  // сводка для карточки обзора: те же признаки, что и внутри мастера
  const checkDone = computeStepDone(profile, photoReady);
  const doneCount = WIZARD_CHECKS.filter((c) => checkDone[c.key]).length;
  const allDone = doneCount === WIZARD_CHECKS.length;
  const progressPercent = Math.round((doneCount / WIZARD_CHECKS.length) * 100);

  if (wizard) {
    return (
      <ProfileWizard
        scope={wizard}
        data={data}
        profile={profile}
        setProfile={setProfile}
        steps={steps}
        setSteps={setSteps}
        locked={locked}
        onExit={() => setWizard(null)}
      />
    );
  }

  return (
    <div className="mx-auto max-w-[900px] px-5 pt-14 pb-24 sm:px-8 lg:pt-20">
      {/* шапка */}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="label-caps text-bronze-text">Кабинет · Специалист</p>
          <h1 className="mt-3 font-display text-4xl leading-[1.08] font-medium text-ink sm:text-5xl">
            {name}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => {
            void authClient.signOut();
            window.location.href = "/";
          }}
          className="label-caps flex min-h-11 items-center gap-2 text-ink-soft transition-colors duration-300 hover:text-ink"
        >
          <SignOut size={16} aria-hidden="true" />
          Выйти
        </button>
      </div>

      {/* статус */}
      <div className={`mt-10 flex items-start gap-4 border p-6 ${banner.box}`}>
        <BannerIcon size={26} weight="thin" className="shrink-0 text-bronze" />
        <div>
          <p className="text-base font-semibold text-ink">{banner.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            {banner.text}
          </p>
          {data.moderationNote && data.status === "rejected" && (
            <p className="mt-3 border-l-2 border-[#a5462f] bg-cream px-4 py-3 text-sm leading-relaxed text-ink">
              <span className="font-semibold">Комментарий модератора:</span>{" "}
              {data.moderationNote}
            </p>
          )}
          {data.status === "active" && data.slug && (
            <Link
              href={`/specialists/${data.slug}`}
              className="label-caps mt-3 inline-block border-b border-ink/30 pb-0.5 text-ink transition-colors duration-300 hover:border-bronze hover:text-bronze-text"
            >
              Открыть анкету в каталоге
            </Link>
          )}
        </div>
      </div>

      {/*
        Переключатель показа. Только для опубликованной анкеты: черновик и
        анкета на проверке в каталоге и так не показываются, и тумблер там
        обещал бы действие, которого не происходит.
      */}
      {data.status === "active" && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border border-line bg-paper p-6">
          <div>
            <p className="text-base font-semibold text-ink">
              {data.available ? "Открыты для предложений" : "Показ приостановлен"}
            </p>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink-soft">
              {data.available
                ? "Анкета в каталоге — семьи находят её и могут открыть ваши контакты."
                : "Анкета убрана из каталога, новые семьи её не найдут. Всё заполненное сохранено — вернуть показ можно в любой момент."}
            </p>
          </div>
          <button
            type="button"
            disabled={availabilityPending}
            onClick={() =>
              startAvailability(async () => {
                const result = await setAvailability({
                  available: !data.available,
                });
                if (result.ok) router.refresh();
              })
            }
            className="label-caps inline-flex min-h-12 shrink-0 items-center gap-2 border border-ink px-6 text-ink transition-colors duration-300 hover:bg-ink hover:text-cream disabled:opacity-60"
          >
            {data.available ? (
              <>
                <EyeSlash size={16} aria-hidden="true" />
                Приостановить показ
              </>
            ) : (
              <>
                <Eye size={16} aria-hidden="true" />
                Вернуть в каталог
              </>
            )}
          </button>
        </div>
      )}

      {/* показатели опубликованной анкеты */}
      {data.status === "active" && (
        <dl className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="border border-line bg-paper p-6">
            <dt className="label-caps flex items-center gap-2 text-ink-faint">
              <PhoneCall size={15} className="text-bronze" /> Открытий контактов
            </dt>
            <dd className="mt-3 font-display text-4xl font-medium text-ink">
              {data.unlockCount}
            </dd>
          </div>
          <div className="border border-line bg-paper p-6">
            <dt className="label-caps flex items-center gap-2 text-ink-faint">
              <Star size={15} className="text-bronze" /> Отзывы
            </dt>
            <dd className="mt-3 font-display text-4xl font-medium text-ink">
              {data.reviewCount}
            </dd>
          </div>
        </dl>
      )}

      {/* анкета — заполняется в отдельном полноэкранном мастере */}
      <section className="mt-10 border border-line bg-paper p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-medium text-ink">
              Анкета
            </h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
              {allDone
                ? "Всё заполнено. Можно отправлять на проверку."
                : `Заполнено ${doneCount} из ${WIZARD_CHECKS.length}. Заполняется по одному вопросу за раз — прокручивать ничего не нужно.`}
            </p>
          </div>
          <p className="font-display text-3xl font-medium text-bronze-text">
            {doneCount}/{WIZARD_CHECKS.length}
          </p>
        </div>

        <div
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Прогресс заполнения анкеты"
          className="mt-5 h-1 w-full bg-line"
        >
          <div
            className="h-full bg-bronze transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
          {WIZARD_CHECKS.map((check) => {
            const done = checkDone[check.key];
            return (
              <li key={check.key} className="flex items-center gap-2.5 text-sm">
                {done ? (
                  <CheckCircle size={16} weight="fill" className="shrink-0 text-bronze" />
                ) : (
                  <Circle size={16} className="shrink-0 text-ink-faint" />
                )}
                <span className={done ? "text-ink" : "text-ink-soft"}>
                  {check.label}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="mt-7 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setWizard("profile")}
            className="label-caps inline-flex min-h-12 items-center justify-center bg-ink px-8 text-cream transition-colors duration-300 hover:bg-charcoal active:translate-y-px"
          >
            {/*
              Черновик: подпись говорит, что осталось. Заполненный черновик
              ещё не отправлен — и кнопка так и называется, иначе человек
              думал бы, что дело сделано.
            */}
            {data.status === "draft" || data.status === "rejected"
              ? allDone
                ? "Отправить на проверку"
                : doneCount === 0
                  ? "Заполнить анкету"
                  : "Продолжить анкету"
              : "Изменить анкету"}
          </button>
          {/* паспорт и справки — разговор после отправки анкеты, не до */}
          {data.status !== "draft" && (
            <button
              type="button"
              onClick={() => setWizard("documents")}
              className="label-caps inline-flex min-h-12 items-center justify-center border border-ink px-8 text-ink transition-colors duration-300 hover:bg-ink hover:text-cream"
            >
              Документы для премиума
            </button>
          )}
        </div>
      </section>

      {/* Ф8 — лента уведомлений: решения модератора приходят сюда */}
      <section id="notifications" className="mt-16 scroll-mt-24">
        <NotificationHeading />
        <NotificationList
          notifications={data.notifications}
          emptyText="Уведомлений пока нет. Здесь появятся решения модератора по анкете и документам."
        />
      </section>
    </div>
  );
}
