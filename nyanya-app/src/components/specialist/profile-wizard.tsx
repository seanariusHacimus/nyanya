"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle } from "@phosphor-icons/react";
import { useToast } from "@/components/ui/toast";
import { stepsForCategory } from "@/content/verification-steps";
import { saveSpecialistProfile } from "@/lib/actions/specialist-profile";
import type { CabinetData, CabinetProfile } from "@/lib/queries/specialist-cabinet";
import {
  VerificationStepCard,
  type StepState,
} from "@/components/specialist/verification-step-card";
import { WizardShell } from "@/components/specialist/wizard-shell";

/**
 * Заполнение анкеты: один вопрос — один экран.
 *
 * Раньше кабинет был длинной формой, и на телефоне человек всё время листал,
 * теряя место. Здесь экран не прокручивается: вопрос, ответ, «Далее».
 *
 * Документы идут отдельным потоком, а не продолжением анкеты. Вместе получалось
 * «шаг 1 из 17» — число, от которого опускаются руки, хотя дела там на два
 * вечера. И это честнее по сути: анкету заполняют за один присест, справки
 * собирают неделями.
 *
 * Анкета сохраняется на каждом переходе вперёд, а не одной кнопкой в конце:
 * заполнение растягивается на дни (справки собирают не за один вечер), и
 * потерять введённое из-за закрытой вкладки человек не должен.
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
  const [index, setIndex] = useState(0);
  const [pending, startSave] = useTransition();

  const set = <K extends keyof CabinetProfile>(key: K, value: CabinetProfile[K]) =>
    setProfile({ ...profile, [key]: value });

  const documentSteps = useMemo(
    () => stepsForCategory(profile.category),
    [profile.category]
  );

  const profileScreens: Screen[] = [
    {
      key: "category",
      title: "Кем вы работаете?",
      hint: "От этого зависит, какие документы у вас попросят.",
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
      hint: "Имя должно совпадать с паспортом — его проверит модератор.",
      ready: profile.fullName.trim().length > 1 && Boolean(profile.birthDate),
      body: (
        <div className="grid gap-5">
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
              autoComplete="name"
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
      key: "district",
      title: "В каком районе вы работаете?",
      hint: "Семьи ищут специалистов рядом с домом.",
      ready: Boolean(profile.districtId),
      body: (
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
      ),
    },
    {
      key: "price",
      title: "Сколько стоит ваша работа?",
      hint: "Цену вы устанавливаете сами и можете поменять в любой момент.",
      ready: profile.priceAmount > 0,
      body: (
        <div className="grid gap-5">
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
      hint: "Необязательно, но семьи смотрят на это в первую очередь.",
      optional: true,
      ready: true,
      body: (
        <div className="grid gap-5">
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
      ),
    },
    {
      key: "languages",
      title: "На каких языках говорите?",
      optional: true,
      ready: true,
      body: (
        <div className="grid gap-6">
          <fieldset className="grid gap-3">
            <legend className="mb-1 text-sm font-semibold text-ink">Языки</legend>
            {["Русский", "Узбекский", "Английский"].map((lang) => (
              <label
                key={lang}
                className="flex min-h-12 cursor-pointer items-center gap-3 border border-line bg-paper px-4 text-base text-ink-soft"
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
        </div>
      ),
    },
    {
      key: "skills",
      title: "Что вы можете предложить?",
      hint: "Отметьте то, что подходит. По этим меткам семьи фильтруют каталог.",
      optional: true,
      ready: true,
      body: (
        <fieldset className="grid gap-3">
          <legend className="sr-only">Дополнительные возможности</legend>
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
      ),
    },
    {
      key: "about",
      title: "Расскажите о себе",
      hint: "Три-пять предложений. Чаще всего именно они решают выбор.",
      ready: profile.description.trim().length > 0,
      body: (
        <div className="grid gap-2">
          <label htmlFor="sp-about" className="sr-only">
            О себе
          </label>
          <textarea
            id="sp-about"
            rows={7}
            value={profile.description}
            onChange={(e) => set("description", e.target.value)}
            className="border border-line bg-paper px-4 py-3 text-base text-ink placeholder:text-ink-faint focus:border-ink"
            placeholder="Расскажите о подходе к работе, опыте и семьях, с которыми работали"
          />
          <p className="text-xs text-ink-faint">
            Разделяйте абзацы пустой строкой.
          </p>
        </div>
      ),
    },
  ];

  const documentScreens: Screen[] = documentSteps.map<Screen>((step) => ({
      key: `doc-${step.key}`,
      title: step.title,
      hint: step.description,
      optional: !step.required,
      // рекомендуемые документы пропускаются, обязательные — нет
      ready: step.required ? steps[step.key]?.status !== "empty" : true,
      body: (
        <ul>
          <VerificationStepCard
            variant="screen"
            step={step}
            index={documentSteps.indexOf(step)}
            state={steps[step.key]}
            locked={locked}
            onChange={(key, next) => setSteps((prev) => ({ ...prev, [key]: next }))}
          />
        </ul>
      ),
  }));

  const doneScreen: Screen = {
    key: "done",
    title: scope === "profile" ? "Анкета заполнена" : "Документы загружены",
    hint:
      scope === "profile"
        ? "Осталось загрузить документы — это делается отдельно и можно не за один день."
        : "Модератор проверит их и опубликует анкету в каталоге.",
    ready: true,
    body: (
      <div className="flex flex-col items-center border border-bronze bg-cream-deep px-6 py-10 text-center">
        <CheckCircle size={44} weight="thin" className="text-bronze" />
        <p className="mt-5 max-w-sm text-sm leading-relaxed text-ink-soft">
          Всё сохранено. Нажмите «Готово» — вернётесь в кабинет.
        </p>
      </div>
    ),
  };

  const screens: Screen[] =
    scope === "profile"
      ? [...profileScreens, doneScreen]
      : [...documentScreens, doneScreen];

  const current = screens[index];
  const isLast = index === screens.length - 1;

  const goNext = () => {
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

  return (
    <WizardShell
      step={index + 1}
      total={screens.length}
      title={current.title}
      hint={current.hint}
      optional={current.optional}
      canGoNext={current.ready}
      nextLabel={
        isLast
          ? "Готово"
          : current.optional && !current.ready
            ? "Пропустить"
            : "Далее"
      }
      onBack={index > 0 ? () => setIndex((i) => i - 1) : null}
      onNext={goNext}
      onExit={onExit}
      busy={pending}
    >
      {current.body}
    </WizardShell>
  );
}
