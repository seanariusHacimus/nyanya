"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CheckCircle, HourglassMedium, Warning } from "@phosphor-icons/react";
import { useToast } from "@/components/ui/toast";
import { stepsForCategory } from "@/content/verification-steps";
import {
  saveSpecialistProfile,
  submitForModeration,
} from "@/lib/actions/specialist-profile";
import type { CabinetData, CabinetProfile } from "@/lib/queries/specialist-cabinet";
import {
  categories,
  PRICE_UNIT_LABEL,
  yearsLabel,
} from "@/lib/specialists-shared";
import {
  VerificationStepCard,
  type StepState,
} from "@/components/specialist/verification-step-card";
import { WizardShell } from "@/components/specialist/wizard-shell";

/**
 * Заполнение анкеты: один вопрос — один экран.
 *
 * Одна дорожка от категории до отправки. Раньше фотография жила в отдельном
 * потоке «документы» вместе с паспортом и справками, а отправка — третьим
 * местом в кабинете; человек после анкеты попадал в кабинет и сам догадывался,
 * что делать дальше. Теперь фото — шестой экран анкеты, а последний экран
 * показывает карточку глазами семьи и одну кнопку «Отправить на проверку».
 *
 * Паспорт и справки в этой дорожке не участвуют: они нужны только для
 * «Премиум-профиля» и идут отдельным потоком (`scope: "documents"`) после
 * отправки анкеты.
 *
 * Анкета сохраняется на каждом переходе вперёд, а не одной кнопкой в конце:
 * закрытая вкладка ничего не теряет, а при возврате мастер открывается на
 * первом незаконченном экране, а не на первом вообще.
 */

const inputClass =
  "min-h-12 w-full border border-line bg-paper px-4 text-base text-ink placeholder:text-ink-faint focus:border-ink";
const selectClass =
  "min-h-12 w-full appearance-none border border-line bg-paper px-4 text-base text-ink focus:border-ink";

const categoryOptions = [
  { key: "nanny", label: "Няня", hint: "Уход за детьми и развитие" },
  { key: "caregiver", label: "Сиделка", hint: "Уход за пожилыми и больными" },
  { key: "tutor", label: "Помощник по хозяйству", hint: "Дом, готовка, порядок" },
  { key: "driver", label: "Водитель", hint: "Поездки для семьи" },
] as const;

const priceUnitOptions = [
  { key: "hour", label: "за час" },
  { key: "day", label: "за день" },
  { key: "month", label: "за месяц" },
] as const;

type Screen = {
  key: string;
  title: string;
  hint?: string;
  optional?: boolean;
  /** Можно ли идти дальше. Для необязательных экранов всегда true. */
  ready: boolean;
  body: ReactNode;
};

export type WizardScope = "profile" | "documents";

/** Индексы экранов анкеты — нужны для возврата и для ссылок «не хватает». */
const SCREEN = {
  category: 0,
  name: 1,
  photo: 2,
  place: 3,
  experience: 4,
  skills: 5,
  final: 6,
} as const;

function nameReady(p: CabinetProfile): boolean {
  return p.fullName.trim().length > 1 && Boolean(p.birthDate);
}
function placeReady(p: CabinetProfile): boolean {
  return Boolean(p.districtId) && p.priceAmount > 0;
}
function photoReady(steps: Record<string, StepState>): boolean {
  return Boolean(steps["profile_photo"]) && steps["profile_photo"].status !== "empty";
}

/**
 * С какого экрана открыть анкету при возврате.
 *
 * Совсем пустая анкета начинается с категории. Иначе — первый обязательный
 * экран, который ещё не заполнен; если заполнено всё — сразу итоговый.
 * Человек, закрывший вкладку на фотографии, открывает фотографию, а не
 * листает заново то, что уже отвечал.
 */
export const PROFILE_SCREEN_COUNT = 7;

export function firstIncompleteScreen(
  p: CabinetProfile,
  steps: Record<string, StepState>
): number {
  const untouched = !p.fullName.trim() && !photoReady(steps) && !p.districtId;
  if (untouched) return SCREEN.category;
  if (!nameReady(p)) return SCREEN.name;
  if (!photoReady(steps)) return SCREEN.photo;
  if (!placeReady(p)) return SCREEN.place;
  return SCREEN.final;
}

function ageFrom(birthDate: string): number | null {
  if (!birthDate) return null;
  const born = new Date(birthDate);
  if (Number.isNaN(born.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - born.getFullYear();
  const beforeBirthday =
    now.getMonth() < born.getMonth() ||
    (now.getMonth() === born.getMonth() && now.getDate() < born.getDate());
  if (beforeBirthday) years -= 1;
  return years;
}

export function ProfileWizard({
  scope,
  data,
  profile,
  setProfile,
  steps,
  setSteps,
  locked,
  onExit,
}: {
  scope: WizardScope;
  data: CabinetData;
  profile: CabinetProfile;
  setProfile: (next: CabinetProfile) => void;
  steps: Record<string, StepState>;
  setSteps: (updater: (prev: Record<string, StepState>) => Record<string, StepState>) => void;
  locked: boolean;
  onExit: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const resumable = data.status === "draft" || data.status === "rejected";
  const [index, setIndex] = useState(() =>
    scope === "profile" && resumable ? firstIncompleteScreen(profile, steps) : 0
  );
  const [pending, startSave] = useTransition();

  const set = <K extends keyof CabinetProfile>(key: K, value: CabinetProfile[K]) =>
    setProfile({ ...profile, [key]: value });

  const documentSteps = useMemo(
    () => stepsForCategory(profile.category),
    [profile.category]
  );
  const photoStep = documentSteps.find((s) => s.key === "profile_photo");
  // паспорт и справки — только для премиума, в дорожке анкеты их нет
  const premiumSteps = documentSteps.filter((s) => s.key !== "profile_photo");

  const districtName =
    data.districts.find((d) => d.id === profile.districtId)?.name ?? null;
  const age = ageFrom(profile.birthDate);
  const hasPhoto = photoReady(steps);

  const missing: { label: string; screen: number }[] = [];
  if (!nameReady(profile)) missing.push({ label: "ФИО и дата рождения", screen: SCREEN.name });
  if (!hasPhoto) missing.push({ label: "Фотография", screen: SCREEN.photo });
  if (!placeReady(profile)) missing.push({ label: "Район и стоимость", screen: SCREEN.place });

  const profileScreens: Screen[] = [
    {
      key: "category",
      title: "Кем вы работаете?",
      hint: "От этого зависит, какие документы у вас попросят для премиума.",
      ready: true,
      body: (
        <fieldset className="grid gap-3">
          <legend className="sr-only">Категория специалиста</legend>
          {categoryOptions.map((option) => {
            const active = profile.category === option.key;
            return (
              <label
                key={option.key}
                className={`flex cursor-pointer items-start gap-4 border p-5 transition-colors duration-300 ${
                  active
                    ? "border-ink bg-cream-deep"
                    : "border-line bg-paper hover:border-bronze/50"
                }`}
              >
                <input
                  type="radio"
                  name="category"
                  value={option.key}
                  checked={active}
                  onChange={() => set("category", option.key)}
                  className="mt-1 size-4 shrink-0 accent-[#96733a]"
                />
                <span>
                  <span className="block text-base font-semibold text-ink">
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-sm text-ink-soft">
                    {option.hint}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>
      ),
    },
    {
      key: "name",
      title: "Как вас зовут?",
      hint: "Полное имя должно совпадать с паспортом — его проверит модератор.",
      ready: nameReady(profile),
      body: (
        <div className="grid gap-5">
          <div className="grid gap-2">
            <label htmlFor="sp-name" className="text-sm font-semibold text-ink">
              Полное имя (ФИО)
            </label>
            <input
              id="sp-name"
              value={profile.fullName}
              onChange={(e) => set("fullName", e.target.value)}
              className={inputClass}
              placeholder="Фамилия Имя Отчество"
              autoComplete="name"
              autoFocus
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
              Семьям показывается только возраст.
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "photo",
      title: "Фотография",
      hint:
        photoStep?.description ??
        "Портрет для анкеты — его видят семьи в каталоге.",
      ready: hasPhoto,
      body: photoStep ? (
        <ul>
          <VerificationStepCard
            variant="screen"
            step={photoStep}
            index={0}
            state={steps[photoStep.key]}
            locked={locked}
            onChange={(key, next) => setSteps((prev) => ({ ...prev, [key]: next }))}
          />
        </ul>
      ) : null,
    },
    {
      key: "place",
      title: "Где и за сколько вы работаете?",
      hint: "Район и стоимость — то, по чему семьи фильтруют каталог чаще всего. Цену можно поменять в любой момент.",
      ready: placeReady(profile),
      body: (
        <div className="grid gap-6">
          <div className="grid gap-2">
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
              inputMode="numeric"
              min={0}
              step={1000}
              value={profile.priceAmount || ""}
              onChange={(e) => set("priceAmount", Number(e.target.value))}
              className={inputClass}
              placeholder="45000"
            />
          </div>
          <fieldset className="grid gap-3">
            <legend className="mb-1 text-sm font-semibold text-ink">
              За какое время
            </legend>
            <div className="grid grid-cols-3 gap-3">
              {priceUnitOptions.map((option) => {
                const active = profile.priceUnit === option.key;
                return (
                  <label
                    key={option.key}
                    className={`flex min-h-12 cursor-pointer items-center justify-center border px-2 text-center text-sm transition-colors duration-300 ${
                      active
                        ? "border-ink bg-cream-deep text-ink"
                        : "border-line bg-paper text-ink-soft hover:border-bronze/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="priceUnit"
                      value={option.key}
                      checked={active}
                      onChange={() => set("priceUnit", option.key)}
                      className="sr-only"
                    />
                    {option.label}
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>
      ),
    },
    {
      key: "experience",
      title: "Расскажите об опыте",
      hint: "Необязательно — но именно это чаще всего решает выбор. Можно пропустить и дописать позже.",
      optional: true,
      ready: true,
      body: (
        <div className="grid gap-5">
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-4">
            <div className="grid gap-2">
              <label htmlFor="sp-exp" className="text-sm font-semibold text-ink">
                Опыт, лет
              </label>
              <input
                id="sp-exp"
                type="number"
                inputMode="numeric"
                min={0}
                max={60}
                value={profile.experienceYears || ""}
                onChange={(e) => set("experienceYears", Number(e.target.value))}
                className={inputClass}
                placeholder="5"
              />
            </div>
            <div className="grid gap-2">
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
          </div>
          <div className="grid gap-2">
            <label htmlFor="sp-about" className="text-sm font-semibold text-ink">
              О себе
            </label>
            <textarea
              id="sp-about"
              rows={5}
              value={profile.description}
              onChange={(e) => set("description", e.target.value)}
              className="border border-line bg-paper px-4 py-3 text-base text-ink placeholder:text-ink-faint focus:border-ink"
              placeholder="Три-пять предложений: подход к работе, опыт, семьи, с которыми работали"
            />
            <p className="text-xs text-ink-faint">
              Анкеты с рассказом выбирают чаще. Абзацы разделяйте пустой строкой.
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "skills",
      title: "Языки и навыки",
      hint: "Отметьте то, что подходит — по этим меткам семьи фильтруют каталог. Можно пропустить.",
      optional: true,
      ready: true,
      body: (
        <div className="grid gap-6">
          <fieldset className="grid gap-3">
            <legend className="mb-1 text-sm font-semibold text-ink">Языки</legend>
            <div className="grid grid-cols-3 gap-3">
              {["Русский", "Узбекский", "Английский"].map((lang) => {
                const active = profile.languages.includes(lang);
                return (
                  <label
                    key={lang}
                    className={`flex min-h-12 cursor-pointer items-center justify-center border px-2 text-center text-sm transition-colors duration-300 ${
                      active
                        ? "border-ink bg-cream-deep text-ink"
                        : "border-line bg-paper text-ink-soft hover:border-bronze/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(e) =>
                        set(
                          "languages",
                          e.target.checked
                            ? [...profile.languages, lang]
                            : profile.languages.filter((l) => l !== lang)
                        )
                      }
                      className="sr-only"
                    />
                    {lang}
                  </label>
                );
              })}
            </div>
          </fieldset>
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
          <fieldset className="grid gap-3">
            <legend className="mb-1 text-sm font-semibold text-ink">
              Что ещё вы можете предложить
            </legend>
            {(
              [
                ["hasCar", "Свой автомобиль"],
                ["liveIn", "Готова работать с проживанием"],
                ["nightAvailable", "Ночные смены"],
                ["newbornExp", "Опыт с новорождёнными"],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className={`flex min-h-12 cursor-pointer items-center gap-3 border px-4 text-base transition-colors duration-300 ${
                  profile[key]
                    ? "border-ink bg-cream-deep text-ink"
                    : "border-line bg-paper text-ink-soft"
                }`}
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
      ),
    },
  ];

  /**
   * Итоговый экран зависит от статуса анкеты.
   *
   * Черновик и возвращённая на доработку — карточка глазами семьи и кнопка
   * отправки. На проверке — сообщение, что менять пока нечего. Опубликованная —
   * подтверждение, что правки уже в каталоге: она сохраняется на каждом шаге и
   * отдельной отправки не требует.
   */
  const finalScreen: Screen = resumable
    ? {
        key: "submit",
        title: "Проверьте и отправьте",
        hint:
          missing.length === 0
            ? "Так вашу анкету увидит семья. Если всё верно — отправляйте, модератор проверит её за 1–2 рабочих дня."
            : "Так вашу анкету увидит семья. Чтобы отправить, заполните то, чего не хватает.",
        ready: missing.length === 0,
        body: (
          <div className="grid gap-5">
            <div className="flex gap-5 border border-line bg-paper p-5">
              <div className="relative size-24 shrink-0 overflow-hidden bg-cream-deep">
                {hasPhoto && steps["profile_photo"].fileKey ? (
                  <Image
                    src={`/api/documents/${steps["profile_photo"].fileKey}`}
                    alt=""
                    fill
                    unoptimized
                    className="object-cover object-top"
                  />
                ) : (
                  <span className="flex size-full items-center justify-center text-xs text-ink-faint">
                    нет фото
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-display text-xl leading-tight font-medium text-ink">
                  {profile.fullName.trim() || "Имя не указано"}
                  {age !== null && `, ${age}`}
                </p>
                <p className="mt-1 text-sm text-ink-soft">
                  {categories[profile.category].label}
                  {districtName ? ` · ${districtName} район` : ""}
                </p>
                <p className="mt-2 font-display text-lg text-ink">
                  {profile.priceAmount > 0
                    ? `от ${profile.priceAmount.toLocaleString("ru-RU")} сум/${PRICE_UNIT_LABEL[profile.priceUnit]}`
                    : "стоимость не указана"}
                </p>
                {profile.experienceYears > 0 && (
                  <p className="mt-1 text-sm text-ink-soft">
                    Опыт: {yearsLabel(profile.experienceYears)}
                  </p>
                )}
              </div>
            </div>

            {missing.length > 0 && (
              <div className="border border-[#a5462f]/40 bg-[#a5462f]/5 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <Warning size={16} className="text-[#a5462f]" aria-hidden="true" />
                  Не хватает
                </p>
                <ul className="mt-2 grid gap-1.5">
                  {missing.map((m) => (
                    <li key={m.screen}>
                      <button
                        type="button"
                        onClick={() => setIndex(m.screen)}
                        className="border-b border-ink/30 pb-0.5 text-sm text-ink transition-colors duration-300 hover:border-bronze hover:text-bronze-text"
                      >
                        {m.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {missing.length === 0 && !profile.description.trim() && (
              <p className="text-sm leading-relaxed text-ink-soft">
                Рассказ о себе не заполнен — отправить можно и так, но анкеты с
                рассказом выбирают чаще.{" "}
                <button
                  type="button"
                  onClick={() => setIndex(SCREEN.experience)}
                  className="border-b border-ink/30 pb-0.5 text-ink transition-colors duration-300 hover:border-bronze hover:text-bronze-text"
                >
                  Дописать
                </button>
              </p>
            )}
          </div>
        ),
      }
    : data.status === "pending_review"
      ? {
          key: "locked",
          title: "Анкета на проверке",
          hint: "Модератор смотрит анкету — обычно это 1–2 рабочих дня. Изменения сохранены.",
          ready: true,
          body: (
            <div className="flex flex-col items-center border border-bronze/50 bg-cream-deep px-6 py-10 text-center">
              <HourglassMedium size={44} weight="thin" className="text-bronze" />
              <p className="mt-5 max-w-sm text-sm leading-relaxed text-ink-soft">
                О результате сообщим письмом и в кабинете.
              </p>
            </div>
          ),
        }
      : {
          key: "saved",
          title: "Изменения сохранены",
          hint: "Анкета в каталоге обновится сразу.",
          ready: true,
          body: (
            <div className="flex flex-col items-center border border-bronze bg-cream-deep px-6 py-10 text-center">
              <CheckCircle size={44} weight="thin" className="text-bronze" />
              <p className="mt-5 max-w-sm text-sm leading-relaxed text-ink-soft">
                Нажмите «В кабинет» — вернётесь к анкете.
              </p>
            </div>
          ),
        };

  const documentScreens: Screen[] = premiumSteps.map<Screen>((step) => ({
    key: `doc-${step.key}`,
    title: step.title,
    hint: step.description,
    // премиум-документы все по желанию: пропустить можно любой
    optional: true,
    ready: true,
    body: (
      <ul>
        <VerificationStepCard
          variant="screen"
          step={step}
          index={premiumSteps.indexOf(step)}
          state={steps[step.key]}
          locked={locked}
          onChange={(key, next) => setSteps((prev) => ({ ...prev, [key]: next }))}
        />
      </ul>
    ),
  }));

  const documentsDone: Screen = {
    key: "done",
    title: "Документы загружены",
    hint: "Модератор проверит их; когда примет все — анкета станет «Премиум-профилем».",
    ready: true,
    body: (
      <div className="flex flex-col items-center border border-bronze bg-cream-deep px-6 py-10 text-center">
        <CheckCircle size={44} weight="thin" className="text-bronze" />
        <p className="mt-5 max-w-sm text-sm leading-relaxed text-ink-soft">
          Всё сохранено. Нажмите «В кабинет».
        </p>
      </div>
    ),
  };

  const screens: Screen[] =
    scope === "profile"
      ? [...profileScreens, finalScreen]
      : [...documentScreens, documentsDone];

  const current = screens[Math.min(index, screens.length - 1)];
  const isLast = index >= screens.length - 1;

  const goNext = () => {
    if (current.key === "submit") {
      startSave(async () => {
        // сохраняем актуальную анкету и только потом отправляем
        const saved = await saveSpecialistProfile(profile);
        if (!saved.ok) {
          toast.error("Не удалось сохранить — проверьте поля.");
          return;
        }
        const result = await submitForModeration();
        if (!result.ok) {
          toast.error(
            result.error === "documents_missing"
              ? "Загрузите фотографию — без неё анкету нельзя отправить."
              : result.error === "profile_incomplete"
                ? "Заполните имя, дату рождения, район и стоимость."
                : "Не удалось отправить анкету. Попробуйте ещё раз."
          );
          return;
        }
        toast.success("Анкета отправлена на проверку");
        router.refresh();
        onExit();
      });
      return;
    }
    if (isLast) {
      onExit();
      return;
    }
    startSave(async () => {
      const result = await saveSpecialistProfile(profile);
      if (!result.ok) {
        toast.error("Не удалось сохранить — проверьте поля.");
        return;
      }
      // документы уходят на модерацию сразу при загрузке, и статус анкеты
      // мог измениться — баннер в кабинете должен это увидеть
      router.refresh();
      setIndex((i) => Math.min(i + 1, screens.length - 1));
    });
  };

  const nextLabel =
    current.key === "submit"
      ? "Отправить на проверку"
      : isLast
        ? "В кабинет"
        : current.optional && !current.ready
          ? "Пропустить"
          : "Далее";

  return (
    <WizardShell
      step={index + 1}
      total={screens.length}
      title={current.title}
      hint={current.hint}
      optional={current.optional}
      canGoNext={current.ready}
      nextLabel={nextLabel}
      onBack={index > 0 ? () => setIndex((i) => i - 1) : null}
      onNext={goNext}
      onExit={onExit}
      busy={pending}
    >
      {current.body}
    </WizardShell>
  );
}
