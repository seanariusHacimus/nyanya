"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Circle,
  HourglassMedium,
  CheckCircle,
  WarningCircle,
  EyeSlash,
  Gauge,
  PhoneCall,
  Star,
  SignOut,
  PaperPlaneTilt,
} from "@phosphor-icons/react";
import { authClient } from "@/lib/auth-client";
import {
  NotificationHeading,
  NotificationList,
} from "@/components/notification-list";
import { stepsForCategory } from "@/content/verification-steps";
import type { CabinetData, CabinetProfile } from "@/lib/queries/specialist-cabinet";
import {
  saveSpecialistProfile,
  submitForModeration,
} from "@/lib/actions/specialist-profile";
import {
  ProfileWizard,
  type WizardScope,
} from "@/components/specialist/profile-wizard";
import type { StepState } from "@/components/specialist/verification-step-card";
import { ButtonLink } from "@/components/ui/button-link";
import { useToast } from "@/components/ui/toast";

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
  { key: "who", label: "Имя и дата рождения" },
  { key: "where", label: "Район и стоимость" },
  { key: "experience", label: "Опыт и навыки" },
  { key: "about", label: "Рассказ о себе" },
  { key: "documents", label: "Обязательные документы" },
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
}: {
  name: string;
  data: CabinetData;
}) {
  const router = useRouter();
  const toast = useToast();
  const [profile, setProfile] = useState<CabinetProfile>(data.profile);
  // состояние шагов держим локально: загрузка обновляет его мгновенно,
  // сервер остаётся источником правды при следующей загрузке страницы
  const [steps, setSteps] = useState<Record<string, StepState>>(data.steps);
  /**
   * Какой поток открыт. Анкета и документы разведены намеренно: вместе они
   * давали «шаг 1 из 17», а собирают их в разные дни.
   */
  const [wizard, setWizard] = useState<WizardScope | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitPending, startSubmit] = useTransition();

  const locked = data.status === "pending_review";
  const banner = banners[data.status];
  const BannerIcon = banner.icon;

  // перечень зависит от категории: водителю добавляется удостоверение
  const applicableSteps = useMemo(
    () => stepsForCategory(profile.category),
    [profile.category]
  );
  const requiredSteps = useMemo(
    () => applicableSteps.filter((s) => s.required),
    [applicableSteps]
  );
  // на проверку пускают обязательные документы; рекомендуемые нужны только
  // для «Премиум-проверен», поэтому в прогресс отправки не входят
  const uploadedRequired = useMemo(
    () => requiredSteps.filter((s) => steps[s.key]?.status !== "empty").length,
    [requiredSteps, steps]
  );
  const requiredReady = uploadedRequired === requiredSteps.length;
  /**
   * Отправить анкету можно с одной фотографией — тот же минимум, что и у
   * публикации. Остальные документы поднимают её до «Премиум-проверен».
   */
  const photoReady = steps["profile_photo"]?.status !== "empty";

  // сводка для карточки обзора: те же признаки, что и внутри мастера
  const checkDone = computeStepDone(profile, photoReady);
  const doneCount = WIZARD_CHECKS.filter((c) => checkDone[c.key]).length;
  const allDone = doneCount === WIZARD_CHECKS.length;
  // «анкета» без документов — по ней подписана первая кнопка
  const profileFilled = WIZARD_CHECKS.filter((c) => c.key !== "documents").every(
    (c) => checkDone[c.key]
  );
  const progressPercent = Math.round((doneCount / WIZARD_CHECKS.length) * 100);

  const profileReady =
    profile.fullName.trim().length > 1 &&
    Boolean(profile.birthDate) &&
    Boolean(profile.districtId) &&
    profile.description.trim().length > 0 &&
    profile.priceAmount > 0;
  const canSubmit = !locked && profileReady && photoReady;

  const submit = () =>
    startSubmit(async () => {
      setSubmitError(null);
      // сохраняем актуальную анкету и только потом отправляем
      const savedResult = await saveSpecialistProfile(profile);
      if (!savedResult.ok) {
        setSubmitError("Проверьте поля анкеты — что-то заполнено неверно.");
        return;
      }
      const result = await submitForModeration();
      if (result.ok) {
        toast.success("Анкета отправлена на проверку");
        router.refresh(); // статус-баннер переключается на «На проверке»
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setSubmitError(
          result.error === "profile_incomplete"
            ? "Заполните обязательные поля анкеты: имя, дата рождения, район, стоимость и рассказ о себе."
            : result.error === "documents_missing"
              ? "Загрузите фотографию — без неё анкету нельзя отправить на проверку."
              : "Не удалось отправить анкету. Попробуйте ещё раз."
        );
      }
    });

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

      {/* показатели опубликованной анкеты */}
      {data.status === "active" && (
        <dl className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="border border-line bg-paper p-6">
            <dt className="label-caps flex items-center gap-2 text-ink-faint">
              <Gauge size={15} className="text-bronze" /> Индекс доверия
            </dt>
            <dd className="mt-3 font-display text-4xl font-medium text-ink">
              {data.trustScore}
            </dd>
          </div>
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
            {profileFilled
              ? "Изменить анкету"
              : doneCount === 0
                ? "Заполнить анкету"
                : "Продолжить анкету"}
          </button>
          <button
            type="button"
            onClick={() => setWizard("documents")}
            className="label-caps inline-flex min-h-12 items-center justify-center border border-ink px-8 text-ink transition-colors duration-300 hover:bg-ink hover:text-cream"
          >
            {requiredReady
              ? `Документы (${uploadedRequired} из ${requiredSteps.length})`
              : `Загрузить документы (${uploadedRequired} из ${requiredSteps.length})`}
          </button>
        </div>
      </section>

      {/* отправка на модерацию */}
      <section className="mt-16 border-t border-line pt-10">
        <h2 className="font-display text-2xl font-medium text-ink">
          Отправить на проверку
        </h2>
        <ul className="mt-5 space-y-2 text-sm">
          <li className="flex items-center gap-2.5">
            {profileReady ? (
              <CheckCircle size={16} weight="fill" className="text-bronze" />
            ) : (
              <Circle size={16} className="text-ink-faint" />
            )}
            <span className={profileReady ? "text-ink" : "text-ink-soft"}>
              Анкета заполнена
            </span>
          </li>
          <li className="flex items-center gap-2.5">
            {requiredReady ? (
              <CheckCircle size={16} weight="fill" className="text-bronze" />
            ) : (
              <Circle size={16} className="text-ink-faint" />
            )}
            <span className={requiredReady ? "text-ink" : "text-ink-soft"}>
              Загружены обязательные документы ({uploadedRequired} из{" "}
              {requiredSteps.length})
            </span>
          </li>
        </ul>

        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit || submitPending}
          className="label-caps mt-7 inline-flex min-h-12 items-center justify-center gap-2 bg-ink px-8 text-cream transition-colors duration-300 hover:bg-charcoal active:translate-y-px disabled:opacity-50"
        >
          <PaperPlaneTilt size={16} aria-hidden="true" />
          {submitPending
            ? "Отправляем…"
            : locked
              ? "Анкета на проверке"
              : "Отправить на проверку"}
        </button>

        {submitError && (
          <p role="alert" className="mt-4 text-sm text-[#a5462f]">
            {submitError}
          </p>
        )}

        <p className="mt-5 text-xs leading-relaxed text-ink-soft">
          После отправки модератор проверит документы и анкету — обычно 1–2
          рабочих дня. Результат придёт в уведомления, а анкета появится в
          каталоге автоматически.
        </p>

        {data.status === "draft" && (
          <div className="mt-8">
            <ButtonLink href="/become-specialist" variant="outline-light">
              Как проходит проверка
            </ButtonLink>
          </div>
        )}
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
