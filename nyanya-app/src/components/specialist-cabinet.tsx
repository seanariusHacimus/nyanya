"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
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
} from "@phosphor-icons/react";
import {
  NotificationHeading,
  NotificationList,
} from "@/components/notification-list";
import type { CabinetData, CabinetProfile } from "@/lib/queries/specialist-cabinet";
import { setAvailability } from "@/lib/actions/specialist-profile";
import {
  ProfileWizard,
  PROFILE_SCREEN_COUNT,
  firstIncompleteScreen,
  type WizardScope,
} from "@/components/specialist/profile-wizard";
import type { StepState } from "@/components/specialist/verification-step-card";
import { PremiumCard } from "@/components/specialist/premium-card";
import { SpecialistAvatar } from "@/components/specialist-avatar";

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
  { key: "who", label: "ФИО, пол и дата рождения" },
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
    who:
      profile.fullName.trim().length > 1 &&
      Boolean(profile.gender) &&
      Boolean(profile.birthDate),
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
  const photoKey = photoReady ? (steps["profile_photo"]?.fileKey ?? null) : null;

  // сводка для карточки обзора: те же признаки, что и внутри мастера
  const checkDone = computeStepDone(profile, photoReady);
  const doneCount = WIZARD_CHECKS.filter((c) => checkDone[c.key]).length;
  const allDone = doneCount === WIZARD_CHECKS.length;
  // номер экрана, с которого мастер продолжит: подпись на кнопке говорит,
  // сколько осталось, вместо списка галочек
  const resumeStep = firstIncompleteScreen(profile, steps) + 1;

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

  const primaryLabel =
    data.status === "rejected"
      ? "Исправить и отправить"
      : data.status === "draft"
        ? allDone
          ? "Отправить на проверку"
          : doneCount === 0
            ? "Заполнить анкету"
            : `Продолжить анкету · шаг ${resumeStep} из ${PROFILE_SCREEN_COUNT}`
        : "Изменить анкету";

  /**
   * Кабинет собирается по статусу, а не одним списком секций.
   *
   * Правило одно: на первом экране телефона — статус и одно следующее
   * действие. Черновику нечего показывать, кроме кнопки «Продолжить»;
   * опубликованной анкете — переключатель показа и две цифры; возвращённой —
   * комментарий модератора раньше всего остального. Пустые секции не
   * рисуются: пустая «лента уведомлений» на телефоне — это ещё один экран
   * прокрутки ради фразы «пока ничего нет».
   */
  return (
    <div className="mx-auto max-w-[900px] px-5 pt-10 pb-24 sm:px-8 lg:pt-16">
      {/* шапка: фото (или аватар по полу) и имя. «Выйти» есть в шапке сайта, дублировать незачем */}
      <p className="label-caps text-bronze-text">Кабинет · Специалист</p>
      <div className="mt-3 flex items-center gap-4 sm:gap-5">
        <div className="relative size-14 shrink-0 overflow-hidden rounded-[2px] bg-cream-deep sm:size-[72px]">
          {photoKey ? (
            <Image
              src={`/api/documents/${photoKey}`}
              alt=""
              fill
              unoptimized
              sizes="72px"
              className="object-cover object-top"
            />
          ) : (
            <SpecialistAvatar gender={profile.gender} name={name} />
          )}
        </div>
        <h1 className="font-display text-3xl leading-[1.08] font-medium text-ink sm:text-5xl">
          {name}
        </h1>
      </div>

      {/* статус и главное действие — один блок */}
      <section className={`mt-8 border p-6 ${banner.box}`}>
        <div className="flex items-start gap-4">
          <BannerIcon size={26} weight="thin" className="mt-0.5 shrink-0 text-bronze" />
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-ink">{banner.title}</p>
            {data.status === "rejected" && data.moderationNote && (
              <p className="mt-3 border-l-2 border-[#a5462f] bg-cream px-4 py-3 text-sm leading-relaxed text-ink">
                <span className="font-semibold">Комментарий модератора:</span>{" "}
                {data.moderationNote}
              </p>
            )}
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              {banner.text}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setWizard("profile")}
            className="label-caps inline-flex min-h-12 w-full items-center justify-center bg-ink px-6 text-cream transition-colors duration-300 hover:bg-charcoal active:translate-y-px sm:w-auto sm:px-8"
          >
            {primaryLabel}
          </button>
          {data.status === "active" && data.slug && (
            <Link
              href={`/specialists/${data.slug}`}
              className="label-caps inline-flex min-h-12 w-full items-center justify-center border border-ink px-6 text-ink transition-colors duration-300 hover:bg-ink hover:text-cream sm:w-auto"
            >
              Открыть в каталоге
            </Link>
          )}
        </div>
      </section>

      {/*
        Переключатель показа. Только для опубликованной анкеты: черновик и
        анкета на проверке в каталоге и так не показываются, и тумблер там
        обещал бы действие, которого не происходит.
      */}
      {data.status === "active" && (
        <section className="mt-4 flex flex-wrap items-center justify-between gap-4 border border-line bg-paper p-6">
          <div className="min-w-0">
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
            className="label-caps inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 border border-ink px-6 text-ink transition-colors duration-300 hover:bg-ink hover:text-cream disabled:opacity-60 sm:w-auto"
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
        </section>
      )}

      {/* показатели опубликованной анкеты */}
      {data.status === "active" && (
        <dl className="mt-4 grid grid-cols-2 gap-4">
          <div className="border border-line bg-paper p-5">
            <dt className="label-caps flex items-center gap-2 text-ink-faint">
              <PhoneCall size={15} className="text-bronze" /> Контактов
            </dt>
            <dd className="mt-2 font-display text-3xl font-medium text-ink sm:text-4xl">
              {data.unlockCount}
            </dd>
          </div>
          <div className="border border-line bg-paper p-5">
            <dt className="label-caps flex items-center gap-2 text-ink-faint">
              <Star size={15} className="text-bronze" /> Отзывов
            </dt>
            <dd className="mt-2 font-display text-3xl font-medium text-ink sm:text-4xl">
              {data.reviewCount}
            </dd>
          </div>
        </dl>
      )}

      {/* премиум — разговор после отправки анкеты, не до; и только пока его нет */}
      {data.status !== "draft" && data.tier !== "premium_verified" && (
        <PremiumCard />
      )}

      {/* Ф8 — лента уведомлений: решения модератора приходят сюда */}
      {data.notifications.length > 0 && (
        <section id="notifications" className="mt-14 scroll-mt-24">
          <NotificationHeading />
          <NotificationList notifications={data.notifications} />
        </section>
      )}
    </div>
  );
}
