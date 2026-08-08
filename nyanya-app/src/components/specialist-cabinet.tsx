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
import { WizardStep } from "@/components/specialist/wizard-step";
import { WizardProgress } from "@/components/specialist/wizard-progress";
import {
  VerificationStepCard,
  type StepState,
} from "@/components/specialist/verification-step-card";
import { ButtonLink } from "@/components/ui/button-link";
import { useToast } from "@/components/ui/toast";

const inputClass =
  "min-h-12 w-full border border-line bg-paper px-4 text-base text-ink placeholder:text-ink-faint focus:border-ink";
const selectClass =
  "min-h-12 w-full appearance-none border border-line bg-paper px-4 text-base text-ink focus:border-ink";

const banners = {
  draft: {
    icon: Circle,
    title: "Черновик",
    text: "Заполните анкету и загрузите обязательные документы — затем отправьте всё на проверку модератору.",
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

const priceUnitLabels = { hour: "час", day: "день", month: "месяц" } as const;

/**
 * Шаги заполнения. Поля сгруппированы так, чтобы каждый шаг отвечал на один
 * вопрос семьи: кто вы, где и почём, что умеете, какой вы, чем это
 * подтверждено. Порядок — от самого простого к самому трудоёмкому: человек
 * успевает почувствовать движение до того, как дойдёт до сбора справок.
 */
const WIZARD_STEPS = [
  { key: "who", title: "Кто вы" },
  { key: "where", title: "Район и стоимость" },
  { key: "experience", title: "Опыт и навыки" },
  { key: "about", title: "Рассказ о себе" },
  { key: "documents", title: "Документы" },
] as const;

type WizardKey = (typeof WIZARD_STEPS)[number]["key"];

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

/** Возраст словами — в свёрнутом шаге он понятнее даты рождения. */
function ageFrom(birthDate: string): string {
  const born = new Date(birthDate);
  if (Number.isNaN(born.getTime())) return "";
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const monthDiff = now.getMonth() - born.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < born.getDate())) age -= 1;
  if (age < 0 || age > 120) return "";
  const tail = age % 10;
  const teen = age % 100 >= 11 && age % 100 <= 14;
  const word = teen || tail === 0 || tail >= 5 ? "лет" : tail === 1 ? "год" : "года";
  return `${age} ${word}`;
}

const categoryLabels = {
  nanny: "Няня",
  caregiver: "Сиделка",
  tutor: "Помощник по хозяйству",
  driver: "Водитель",
} as const;

/** Кнопки под открытым шагом — их пять одинаковых. */
function StepFooter({
  ready,
  hint,
  pending,
  onNext,
  nextLabel = "Сохранить и продолжить",
}: {
  ready: boolean;
  hint: string;
  pending: boolean;
  onNext: () => void;
  nextLabel?: string;
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-4">
      <button
        type="button"
        onClick={onNext}
        disabled={pending}
        className="label-caps inline-flex min-h-12 items-center justify-center bg-ink px-8 text-cream transition-colors duration-300 hover:bg-charcoal active:translate-y-px disabled:opacity-60"
      >
        {pending ? "Сохраняем…" : nextLabel}
      </button>
      {!ready && hint && <span className="text-sm text-ink-soft">{hint}</span>}
    </div>
  );
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
   * Открыт ровно один шаг — иначе смысл в сворачивании пропадает. При
   * загрузке открываем первый незаполненный: человек должен увидеть, что от
   * него хотят, а не пять закрытых карточек.
   */
  const [openStep, setOpenStep] = useState<WizardKey | null>(() => {
    const initialDone = computeStepDone(
      data.profile,
      stepsForCategory(data.profile.category)
        .filter((s) => s.required)
        .every((s) => data.steps[s.key]?.status !== "empty")
    );
    return WIZARD_STEPS.find((s) => !initialDone[s.key])?.key ?? null;
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savePending, startSave] = useTransition();
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

  const districtName =
    data.districts.find((d) => d.id === profile.districtId)?.name ?? null;

  const stepDone = computeStepDone(profile, requiredReady);

  const doneCount = WIZARD_STEPS.filter((s) => stepDone[s.key]).length;
  const nextTodo = WIZARD_STEPS.find((s) => !stepDone[s.key]) ?? null;

  const experienceSummary = [
    profile.experienceYears > 0 ? `опыт ${profile.experienceYears} лет` : null,
    profile.education.trim() || null,
    profile.languages.length ? profile.languages.join(", ") : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const toggle = (key: WizardKey) =>
    setOpenStep((current) => (current === key ? null : key));

  /**
   * Сохраняем и переходим к первому незаполненному шагу.
   *
   * Считаем следующий шаг от актуального состояния формы, а не от списка
   * `stepDone`: он вычислен при отрисовке и ещё не знает про только что
   * введённое значение.
   */
  const saveAndAdvance = (from: WizardKey) =>
    startSave(async () => {
      const result = await saveSpecialistProfile(profile);
      if (!result.ok) {
        toast.error("Не удалось сохранить анкету — проверьте поля.");
        return;
      }
      // Тост об успехе не нужен: шаг на глазах сворачивается в строку с
      // галочкой, а прогресс сверху растёт. Пять шагов подряд давали пять
      // всплывающих подтверждений одно поверх другого.
      const order = WIZARD_STEPS.map((s) => s.key);
      const next =
        order.slice(order.indexOf(from) + 1).find((key) => !stepDone[key]) ??
        order.find((key) => !stepDone[key] && key !== from) ??
        null;
      setOpenStep(next);
    });

  const profileReady =
    profile.fullName.trim().length > 1 &&
    Boolean(profile.birthDate) &&
    Boolean(profile.districtId) &&
    profile.description.trim().length > 0 &&
    profile.priceAmount > 0;
  const canSubmit = !locked && profileReady && requiredReady;

  const set = <K extends keyof CabinetProfile>(
    key: K,
    value: CabinetProfile[K]
  ) => {
    setProfile((p) => ({ ...p, [key]: value }));
  };

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
              ? "Загрузите все обязательные документы — без них анкету нельзя отправить на проверку."
              : "Не удалось отправить анкету. Попробуйте ещё раз."
        );
      }
    });

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

      {/* заполнение анкеты по шагам */}
      <WizardProgress
        done={doneCount}
        total={WIZARD_STEPS.length}
        label={nextTodo ? `Дальше: ${nextTodo.title.toLowerCase()}` : "Осталось отправить на проверку"}
      />

      <ul className="mt-8 space-y-4">
        <WizardStep
          number={1}
          title="Кто вы"
          hint="Категория, имя и возраст — это первое, что видит семья."
          done={stepDone.who}
          open={openStep === "who"}
          summary={`${categoryLabels[profile.category]} · ${profile.fullName}${
            profile.birthDate ? ` · ${ageFrom(profile.birthDate)}` : ""
          }`}
          onOpen={() => toggle("who")}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <label htmlFor="sp-category" className="text-sm font-semibold text-ink">
                Кем вы работаете
              </label>
              <select
                id="sp-category"
                value={profile.category}
                onChange={(e) =>
                  set("category", e.target.value as CabinetProfile["category"])
                }
                className={selectClass}
              >
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-ink-faint">
                От категории зависит, какие документы у вас попросят.
              </p>
            </div>

            <div className="grid gap-2">
              <label htmlFor="sp-name" className="text-sm font-semibold text-ink">
                Имя и фамилия
              </label>
              <input
                id="sp-name"
                value={profile.fullName}
                onChange={(e) => set("fullName", e.target.value)}
                className={inputClass}
                placeholder="Как в паспорте"
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="sp-birth" className="text-sm font-semibold text-ink">
                Дата рождения
              </label>
              <input
                id="sp-birth"
                type="date"
                value={profile.birthDate}
                onChange={(e) => set("birthDate", e.target.value)}
                className={inputClass}
              />
              <p className="text-xs text-ink-faint">
                В анкете показывается только возраст.
              </p>
            </div>
          </div>
          <StepFooter
            ready={stepDone.who}
            hint="Заполните имя и дату рождения."
            pending={savePending}
            onNext={() => saveAndAdvance("who")}
          />
        </WizardStep>

        <WizardStep
          number={2}
          title="Район и стоимость"
          hint="Где вы работаете и сколько стоит ваша работа."
          done={stepDone.where}
          open={openStep === "where"}
          summary={`${districtName ?? "Район не выбран"} · ${
            profile.priceAmount
              ? `от ${profile.priceAmount.toLocaleString("ru-RU")} сум/${priceUnitLabels[profile.priceUnit]}`
              : "цена не указана"
          }`}
          onOpen={() => toggle("where")}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <label htmlFor="sp-district" className="text-sm font-semibold text-ink">
                Район Ташкента
              </label>
              <select
                id="sp-district"
                value={profile.districtId ?? ""}
                onChange={(e) =>
                  set("districtId", e.target.value ? Number(e.target.value) : null)
                }
                className={selectClass}
              >
                <option value="">Выберите…</option>
                {data.districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <label htmlFor="sp-price" className="text-sm font-semibold text-ink">
                Стоимость, сум
              </label>
              <input
                id="sp-price"
                type="number"
                min={0}
                step={1000}
                value={profile.priceAmount || ""}
                onChange={(e) => set("priceAmount", Number(e.target.value))}
                className={inputClass}
                placeholder="45000"
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="sp-unit" className="text-sm font-semibold text-ink">
                За какое время
              </label>
              <select
                id="sp-unit"
                value={profile.priceUnit}
                onChange={(e) =>
                  set("priceUnit", e.target.value as CabinetProfile["priceUnit"])
                }
                className={selectClass}
              >
                <option value="hour">за час</option>
                <option value="day">за день</option>
                <option value="month">за месяц</option>
              </select>
            </div>
          </div>
          <StepFooter
            ready={stepDone.where}
            hint="Выберите район и укажите стоимость."
            pending={savePending}
            onNext={() => saveAndAdvance("where")}
          />
        </WizardStep>

        <WizardStep
          number={3}
          title="Опыт и навыки"
          hint="Чем вы отличаетесь от других специалистов."
          optional
          done={stepDone.experience}
          open={openStep === "experience"}
          summary={experienceSummary}
          onOpen={() => toggle("experience")}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2">
              <label htmlFor="sp-exp" className="text-sm font-semibold text-ink">
                Опыт, лет
              </label>
              <input
                id="sp-exp"
                type="number"
                min={0}
                max={60}
                value={profile.experienceYears || ""}
                onChange={(e) => set("experienceYears", Number(e.target.value))}
                className={inputClass}
                placeholder="5"
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="sp-eng" className="text-sm font-semibold text-ink">
                Уровень английского
              </label>
              <select
                id="sp-eng"
                value={profile.englishLevel}
                onChange={(e) =>
                  set("englishLevel", e.target.value as CabinetProfile["englishLevel"])
                }
                className={selectClass}
              >
                <option value="none">Нет</option>
                <option value="basic">Базовый</option>
                <option value="fluent">Свободный</option>
              </select>
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <label htmlFor="sp-edu" className="text-sm font-semibold text-ink">
                Образование
              </label>
              <input
                id="sp-edu"
                value={profile.education}
                onChange={(e) => set("education", e.target.value)}
                className={inputClass}
                placeholder="Педагогический колледж"
              />
            </div>

            <fieldset className="grid gap-3">
              <legend className="text-sm font-semibold text-ink">Языки</legend>
              {["Русский", "Узбекский", "Английский"].map((lang) => (
                <label
                  key={lang}
                  className="flex cursor-pointer items-center gap-3 text-sm text-ink-soft"
                >
                  <input
                    type="checkbox"
                    checked={profile.languages.includes(lang)}
                    onChange={(e) =>
                      set(
                        "languages",
                        e.target.checked
                          ? [...profile.languages, lang]
                          : profile.languages.filter((l) => l !== lang)
                      )
                    }
                    className="size-4 accent-[#96733a]"
                  />
                  {lang}
                </label>
              ))}
            </fieldset>

            <fieldset className="grid gap-3">
              <legend className="text-sm font-semibold text-ink">
                Что вы можете
              </legend>
              {(
                [
                  ["hasCar", "Свой автомобиль"],
                  ["liveIn", "С проживанием"],
                  ["nightAvailable", "Ночные смены"],
                  ["newbornExp", "Опыт с новорождёнными"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-3 text-sm text-ink-soft"
                >
                  <input
                    type="checkbox"
                    checked={profile[key]}
                    onChange={(e) => set(key, e.target.checked)}
                    className="size-4 accent-[#96733a]"
                  />
                  {label}
                </label>
              ))}
            </fieldset>
          </div>
          <StepFooter
            ready
            hint=""
            pending={savePending}
            onNext={() => saveAndAdvance("experience")}
            nextLabel={stepDone.experience ? "Сохранить и продолжить" : "Пропустить"}
          />
        </WizardStep>

        <WizardStep
          number={4}
          title="Рассказ о себе"
          hint="Несколько предложений, которые чаще всего и решают выбор."
          done={stepDone.about}
          open={openStep === "about"}
          summary={
            profile.description
              ? `${profile.description.trim().slice(0, 90)}${profile.description.trim().length > 90 ? "…" : ""}`
              : ""
          }
          onOpen={() => toggle("about")}
        >
          <div className="grid gap-2">
            <label htmlFor="sp-about" className="text-sm font-semibold text-ink">
              О себе
            </label>
            <textarea
              id="sp-about"
              rows={6}
              value={profile.description}
              onChange={(e) => set("description", e.target.value)}
              className="border border-line bg-paper px-4 py-3 text-base text-ink placeholder:text-ink-faint focus:border-ink"
              placeholder="Расскажите о подходе к работе, опыте и семьях, с которыми работали"
            />
            <p className="text-xs text-ink-faint">
              3–5 предложений достаточно. Разделяйте абзацы пустой строкой.
            </p>
          </div>
          <StepFooter
            ready={stepDone.about}
            hint="Напишите хотя бы пару предложений."
            pending={savePending}
            onNext={() => saveAndAdvance("about")}
          />
        </WizardStep>

        <WizardStep
          number={5}
          title="Документы"
          hint="Обязательные нужны для публикации и значка «Проверен»; рекомендуемые поднимают анкету до «Премиум-проверен»."
          done={stepDone.documents}
          open={openStep === "documents"}
          summary={`Обязательные загружены (${uploadedRequired} из ${requiredSteps.length})`}
          onOpen={() => toggle("documents")}
        >
          <p className="text-sm leading-relaxed text-ink-soft">
            Файлы видят только вы и модератор — в каталоге показывается лишь ваша
            фотография. Обязательных документов: {requiredSteps.length}, загружено{" "}
            {uploadedRequired}.
          </p>

          {locked && (
            <p className="mt-5 border border-bronze/40 bg-cream-deep px-4 py-3 text-sm leading-relaxed text-ink">
              Пока анкета на проверке, документы менять нельзя. Если нужно что-то
              исправить — дождитесь ответа модератора.
            </p>
          )}

          <ul className="mt-6 space-y-4">
            {applicableSteps.map((step, i) => (
              <VerificationStepCard
                key={step.key}
                step={step}
                index={i}
                state={steps[step.key]}
                locked={locked}
                onChange={(key, next) =>
                  setSteps((prev) => ({ ...prev, [key]: next }))
                }
              />
            ))}
          </ul>
        </WizardStep>
      </ul>

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
