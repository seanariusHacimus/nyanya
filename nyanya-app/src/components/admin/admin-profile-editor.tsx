"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, PencilSimple, Warning } from "@phosphor-icons/react";
import { adminUpdateProfile } from "@/lib/actions/admin-edit-profile";

/**
 * Правка анкеты в карточке администратора.
 *
 * Показывает данные так, как их видит семья, а по нажатию превращается в
 * форму на том же месте. Отдельная страница правки здесь была бы хуже:
 * модератор сверяет введённое с документом, открытым рядом, и уход со
 * страницы рвёт это сопоставление.
 *
 * Правка не снимает анкету с публикации — опечатку находят уже после
 * публикации, и заставлять человека выпадать из каталога ради запятой
 * бессмысленно.
 */

const inputClass =
  "min-h-11 w-full border border-line bg-paper px-3 text-base text-ink focus:border-ink";
const selectClass =
  "min-h-11 w-full appearance-none border border-line bg-paper px-3 text-base text-ink focus:border-ink";

const categories = [
  { key: "nanny", label: "Няня" },
  { key: "caregiver", label: "Сиделка" },
  { key: "tutor", label: "Помощник по хозяйству" },
  { key: "driver", label: "Водитель" },
] as const;

const LANGUAGES = ["Русский", "Узбекский", "Английский"] as const;

export type EditableProfile = {
  profileId: string;
  fullName: string;
  category: "nanny" | "caregiver" | "tutor" | "driver";
  birthDate: string;
  districtId: number | null;
  priceAmount: number;
  priceUnit: "hour" | "day" | "month";
  experienceYears: number;
  education: string;
  description: string;
  englishLevel: "none" | "basic" | "fluent";
  languages: string[];
  hasCar: boolean;
  liveIn: boolean;
  nightAvailable: boolean;
  newbornExp: boolean;
  phone: string;
};

export function AdminProfileEditor({
  initial,
  districts,
  districtName,
  published,
}: {
  initial: EditableProfile;
  districts: { id: number; name: string }[];
  districtName: string | null;
  /** Опубликованную правим тоже — просто предупреждаем, что увидит семья. */
  published: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditableProfile>(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof EditableProfile>(
    key: K,
    value: EditableProfile[K]
  ) => setForm((f) => ({ ...f, [key]: value }));

  const priceUnitLabel =
    form.priceUnit === "hour" ? "час" : form.priceUnit === "day" ? "день" : "месяц";

  const save = () =>
    start(async () => {
      setError(null);
      const result = await adminUpdateProfile(form);
      if (!result.ok) {
        setError(
          result.detail ??
            (result.error === "experience_too_high"
              ? "Опыт больше возраста — проверьте поля."
              : "Не удалось сохранить. Проверьте поля.")
        );
        return;
      }
      setEditing(false);
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 4000);
    });

  if (!editing) {
    return (
      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-medium text-ink">
            Что видит семья
          </h2>
          <div className="flex items-center gap-4">
            {saved && (
              <span
                role="status"
                className="label-caps flex items-center gap-1.5 text-bronze-text"
              >
                <CheckCircle size={15} weight="fill" />
                Сохранено
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setForm(initial);
                setEditing(true);
              }}
              className="label-caps inline-flex min-h-11 items-center gap-2 border border-ink px-5 text-ink transition-colors duration-300 hover:bg-ink hover:text-cream"
            >
              <PencilSimple size={15} aria-hidden="true" />
              Изменить
            </button>
          </div>
        </div>

        <dl className="mt-5 grid gap-x-8 gap-y-4 border border-line bg-paper p-6 sm:grid-cols-2">
          <Row label="Имя и фамилия" value={initial.fullName} />
          <Row
            label="Категория"
            value={categories.find((c) => c.key === initial.category)?.label ?? "—"}
          />
          <Row label="Телефон" value={initial.phone || "не указан"} />
          <Row label="Дата рождения" value={initial.birthDate || "не указана"} />
          <Row label="Район" value={districtName ?? "не выбран"} />
          <Row
            label="Стоимость"
            value={
              initial.priceAmount
                ? `от ${initial.priceAmount.toLocaleString("ru-RU")} сум/${priceUnitLabel}`
                : "не указана"
            }
          />
          <Row
            label="Опыт"
            value={initial.experienceYears ? `${initial.experienceYears} лет` : "не указан"}
          />
          <Row label="Образование" value={initial.education || "не указано"} />
          <Row
            label="Языки"
            value={initial.languages.length ? initial.languages.join(", ") : "не указаны"}
          />
          <Row
            label="Английский"
            value={
              { none: "нет", basic: "базовый", fluent: "свободный" }[
                initial.englishLevel
              ]
            }
          />
          <div className="sm:col-span-2">
            <dt className="label-caps text-ink-faint">Возможности</dt>
            <dd className="mt-1 text-sm text-ink">
              {[
                initial.hasCar && "свой автомобиль",
                initial.liveIn && "с проживанием",
                initial.nightAvailable && "ночные смены",
                initial.newbornExp && "опыт с новорождёнными",
              ]
                .filter(Boolean)
                .join(" · ") || "не отмечены"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="label-caps text-ink-faint">О себе</dt>
            <dd className="mt-2 text-sm leading-relaxed text-ink">
              {initial.description || "не заполнено"}
            </dd>
          </div>
        </dl>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <h2 className="font-display text-2xl font-medium text-ink">
        Изменение анкеты
      </h2>
      {published && (
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Анкета опубликована: изменения увидят семьи сразу после сохранения.
          С публикации она не снимается, адрес анкеты не меняется.
        </p>
      )}

      <div className="mt-5 grid gap-5 border border-ink bg-paper p-6 sm:grid-cols-2">
        <Field label="Имя и фамилия" id="ed-name" className="sm:col-span-2">
          <input id="ed-name" value={form.fullName} maxLength={120}
            onChange={(e) => set("fullName", e.target.value)} className={inputClass} />
        </Field>

        <Field label="Категория" id="ed-category"
          hint="Меняет перечень документов и может изменить уровень проверки.">
          <select id="ed-category" value={form.category} className={selectClass}
            onChange={(e) => set("category", e.target.value as EditableProfile["category"])}>
            {categories.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Телефон" id="ed-phone" hint="Его видит семья, открывшая контакты.">
          <input id="ed-phone" type="tel" value={form.phone} maxLength={20}
            onChange={(e) => set("phone", e.target.value)} className={inputClass} />
        </Field>

        <Field label="Дата рождения" id="ed-birth">
          <input id="ed-birth" type="date" value={form.birthDate}
            onChange={(e) => set("birthDate", e.target.value)} className={inputClass} />
        </Field>

        <Field label="Район" id="ed-district">
          <select id="ed-district" value={form.districtId ?? ""} className={selectClass}
            onChange={(e) => set("districtId", e.target.value ? Number(e.target.value) : null)}>
            <option value="">Выберите…</option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </Field>

        <Field label="Стоимость, сум" id="ed-price">
          <input id="ed-price" type="number" min={0} step={1000} value={form.priceAmount || ""}
            onChange={(e) => set("priceAmount", Number(e.target.value))} className={inputClass} />
        </Field>

        <Field label="За какое время" id="ed-unit">
          <select id="ed-unit" value={form.priceUnit} className={selectClass}
            onChange={(e) => set("priceUnit", e.target.value as EditableProfile["priceUnit"])}>
            <option value="hour">за час</option>
            <option value="day">за день</option>
            <option value="month">за месяц</option>
          </select>
        </Field>

        <Field label="Опыт, лет" id="ed-exp" hint="Не больше, чем возраст минус 16.">
          <input id="ed-exp" type="number" min={0} max={60} value={form.experienceYears || ""}
            onChange={(e) => set("experienceYears", Number(e.target.value))} className={inputClass} />
        </Field>

        <Field label="Уровень английского" id="ed-eng">
          <select id="ed-eng" value={form.englishLevel} className={selectClass}
            onChange={(e) => set("englishLevel", e.target.value as EditableProfile["englishLevel"])}>
            <option value="none">Нет</option>
            <option value="basic">Базовый</option>
            <option value="fluent">Свободный</option>
          </select>
        </Field>

        <Field label="Образование" id="ed-edu" className="sm:col-span-2">
          <input id="ed-edu" value={form.education} maxLength={300}
            onChange={(e) => set("education", e.target.value)} className={inputClass} />
        </Field>

        <fieldset className="sm:col-span-2">
          <legend className="text-sm font-semibold text-ink">Языки</legend>
          <div className="mt-3 flex flex-wrap gap-4">
            {LANGUAGES.map((lang) => (
              <label key={lang} className="flex items-center gap-2.5 text-sm text-ink-soft">
                <input type="checkbox" checked={form.languages.includes(lang)}
                  onChange={(e) =>
                    set("languages", e.target.checked
                      ? [...form.languages, lang]
                      : form.languages.filter((l) => l !== lang))}
                  className="size-4 accent-[#96733a]" />
                {lang}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="sm:col-span-2">
          <legend className="text-sm font-semibold text-ink">Возможности</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {(
              [
                ["hasCar", "Свой автомобиль"],
                ["liveIn", "С проживанием"],
                ["nightAvailable", "Ночные смены"],
                ["newbornExp", "Опыт с новорождёнными"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2.5 text-sm text-ink-soft">
                <input type="checkbox" checked={form[key]}
                  onChange={(e) => set(key, e.target.checked)}
                  className="size-4 accent-[#96733a]" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <Field label="О себе" id="ed-about" className="sm:col-span-2">
          <textarea id="ed-about" rows={5} value={form.description} maxLength={4000}
            onChange={(e) => set("description", e.target.value)}
            className="w-full border border-line bg-paper px-3 py-3 text-base text-ink focus:border-ink" />
        </Field>
      </div>

      {error && (
        <p role="alert"
          className="mt-4 flex items-start gap-3 border border-[#a5462f]/40 bg-[#a5462f]/5 px-4 py-3 text-sm leading-relaxed text-ink">
          <Warning size={18} className="mt-0.5 shrink-0 text-[#a5462f]" />
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button type="button" onClick={save} disabled={pending}
          className="label-caps inline-flex min-h-12 items-center bg-ink px-8 text-cream transition-colors duration-300 hover:bg-charcoal disabled:opacity-60">
          {pending ? "Сохраняем…" : "Сохранить изменения"}
        </button>
        <button type="button" onClick={() => { setEditing(false); setError(null); }}
          disabled={pending}
          className="label-caps min-h-12 text-ink-soft transition-colors duration-300 hover:text-ink">
          Отмена
        </button>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label-caps text-ink-faint">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{value}</dd>
    </div>
  );
}

function Field({
  label,
  id,
  hint,
  className = "",
  children,
}: {
  label: string;
  id: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`grid gap-2 ${className}`}>
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}
