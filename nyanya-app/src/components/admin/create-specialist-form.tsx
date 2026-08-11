"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Warning } from "@phosphor-icons/react";
import { adminCreateSpecialist } from "@/lib/actions/admin-create-specialist";

/**
 * Форма «добавить анкету» в админке.
 *
 * Заводит полноценный аккаунт специалиста: почта, пароль и анкета. Пароль
 * администратор передаёт человеку, и дальше тот работает в кабинете сам —
 * меняет анкету, догружает документы. Это осознанно не «анкета-призрак»:
 * призрак нельзя ни передать, ни поправить руками владельца.
 *
 * Пароль генерируется кнопкой и показывается открытым ровно один раз — после
 * ухода со страницы его уже не прочитать, в базе лежит только отпечаток.
 */

const inputClass =
  "min-h-12 w-full border border-line bg-paper px-4 text-base text-ink placeholder:text-ink-faint focus:border-ink";
const selectClass =
  "min-h-12 w-full appearance-none border border-line bg-paper px-4 text-base text-ink focus:border-ink";

const categories = [
  { key: "nanny", label: "Няня" },
  { key: "caregiver", label: "Сиделка" },
  { key: "tutor", label: "Помощник по хозяйству" },
  { key: "driver", label: "Водитель" },
] as const;

/** Пароль для передачи человеку: читаемый вслух, без похожих символов. */
function generatePassword(): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export function CreateSpecialistForm({
  districts,
}: {
  districts: { id: number; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(
    null
  );
  const [password, setPassword] = useState(generatePassword);

  if (created) {
    return (
      <div className="border border-bronze bg-cream-deep p-8">
        <CheckCircle size={40} weight="thin" className="text-bronze" />
        <h2 className="mt-5 font-display text-2xl font-medium text-ink">
          Анкета создана
        </h2>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-soft">
          Анкета сохранена черновиком — она появится в каталоге только после
          того, как вы её опубликуете. Передайте специалисту доступы: войти
          он сможет на странице входа обычным способом.
        </p>

        <dl className="mt-6 grid gap-3 border border-line bg-paper p-5 sm:max-w-md">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <dt className="label-caps text-ink-faint">Почта</dt>
            <dd className="font-mono text-sm text-ink">{created.email}</dd>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <dt className="label-caps text-ink-faint">Пароль</dt>
            <dd className="font-mono text-sm text-ink">{created.password}</dd>
          </div>
        </dl>
        <p className="mt-3 max-w-lg text-xs leading-relaxed text-ink-soft">
          Пароль показывается один раз: в базе хранится только его отпечаток,
          прочитать его позже нельзя. Скопируйте сейчас.
        </p>

        <div className="mt-7 flex flex-wrap gap-4">
          <Link
            href="/admin"
            className="label-caps inline-flex min-h-12 items-center justify-center bg-ink px-8 text-cream transition-colors duration-300 hover:bg-charcoal"
          >
            К списку анкет
          </Link>
          <button
            type="button"
            onClick={() => {
              setCreated(null);
              setPassword(generatePassword());
            }}
            className="label-caps inline-flex min-h-12 items-center justify-center border border-ink px-8 text-ink transition-colors duration-300 hover:bg-ink hover:text-cream"
          >
            Добавить ещё
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const payload = {
          fullName: String(form.get("fullName") ?? ""),
          email: String(form.get("email") ?? ""),
          phone: String(form.get("phone") ?? ""),
          password: String(form.get("password") ?? ""),
          category: String(form.get("category") ?? "nanny"),
          birthDate: String(form.get("birthDate") ?? ""),
          districtId: Number(form.get("districtId") ?? 0),
          priceAmount: Number(form.get("priceAmount") ?? 0),
          priceUnit: String(form.get("priceUnit") ?? "hour"),
          description: String(form.get("description") ?? ""),
          experienceYears: Number(form.get("experienceYears") ?? 0),
          education: String(form.get("education") ?? ""),
        };
        setError(null);
        start(async () => {
          const result = await adminCreateSpecialist(payload);
          if (result.ok) {
            setCreated({ email: payload.email, password: payload.password });
            router.refresh();
            return;
          }
          setError(
            result.detail ??
              (result.error === "email_taken"
                ? "Эта почта уже занята."
                : result.error === "forbidden" || result.error === "unauthorized"
                  ? "Недостаточно прав."
                  : "Проверьте поля — что-то заполнено неверно.")
          );
        });
      }}
      className="space-y-8"
    >
      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="mb-4 font-display text-xl font-medium text-ink">
          Специалист
        </legend>

        <Field label="Имя и фамилия" id="af-name" className="sm:col-span-2">
          <input id="af-name" name="fullName" required maxLength={120}
            className={inputClass} placeholder="Как в паспорте" />
        </Field>

        <Field label="Почта" id="af-email" hint="По ней специалист будет входить. Должна быть настоящей.">
          <input id="af-email" name="email" type="email" required
            className={inputClass} placeholder="specialist@example.com" />
        </Field>

        <Field label="Телефон" id="af-phone" hint="Его увидит семья, открывшая контакты.">
          <input id="af-phone" name="phone" type="tel" required minLength={7} maxLength={20}
            className={inputClass} placeholder="+998 90 123-45-67" />
        </Field>

        <Field label="Пароль для входа" id="af-password" className="sm:col-span-2"
          hint="Передайте его специалисту. Показывается один раз.">
          <div className="flex flex-wrap gap-3">
            <input id="af-password" name="password" required minLength={8}
              value={password} onChange={(e) => setPassword(e.target.value)}
              className={`${inputClass} font-mono sm:flex-1`} />
            <button type="button" onClick={() => setPassword(generatePassword())}
              className="label-caps min-h-12 shrink-0 border border-ink px-6 text-ink transition-colors duration-300 hover:bg-ink hover:text-cream">
              Сгенерировать
            </button>
          </div>
        </Field>
      </fieldset>

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="mb-4 font-display text-xl font-medium text-ink">
          Анкета
        </legend>

        <Field label="Категория" id="af-category">
          <select id="af-category" name="category" className={selectClass} defaultValue="nanny">
            {categories.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Дата рождения" id="af-birth" hint="Семьям показывается только возраст.">
          <input id="af-birth" name="birthDate" type="date" required className={inputClass} />
        </Field>

        <Field label="Район" id="af-district">
          <select id="af-district" name="districtId" required className={selectClass} defaultValue="">
            <option value="" disabled>Выберите…</option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </Field>

        <Field label="Опыт, лет" id="af-exp">
          <input id="af-exp" name="experienceYears" type="number" min={0} max={60}
            defaultValue={0} className={inputClass} />
        </Field>

        <Field label="Стоимость, сум" id="af-price">
          <input id="af-price" name="priceAmount" type="number" min={1000} step={1000}
            required className={inputClass} placeholder="45000" />
        </Field>

        <Field label="За какое время" id="af-unit">
          <select id="af-unit" name="priceUnit" className={selectClass} defaultValue="hour">
            <option value="hour">за час</option>
            <option value="day">за день</option>
            <option value="month">за месяц</option>
          </select>
        </Field>

        <Field label="Образование" id="af-edu" className="sm:col-span-2">
          <input id="af-edu" name="education" maxLength={300} className={inputClass}
            placeholder="Педагогический колледж" />
        </Field>

        <Field label="О себе" id="af-about" className="sm:col-span-2"
          hint="Этот текст семьи читают в анкете. Специалист сможет его поправить сам.">
          <textarea id="af-about" name="description" rows={5} maxLength={4000}
            className="border border-line bg-paper px-4 py-3 text-base text-ink placeholder:text-ink-faint focus:border-ink"
            placeholder="Опыт, подход к работе, с какими семьями работал(а)" />
        </Field>
      </fieldset>

      {error && (
        <p role="alert"
          className="flex items-start gap-3 border border-[#a5462f]/40 bg-[#a5462f]/5 px-4 py-3 text-sm leading-relaxed text-ink">
          <Warning size={18} className="mt-0.5 shrink-0 text-[#a5462f]" />
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4 border-t border-line pt-6">
        <button type="submit" disabled={pending}
          className="label-caps inline-flex min-h-12 items-center justify-center bg-ink px-8 text-cream transition-colors duration-300 hover:bg-charcoal active:translate-y-px disabled:opacity-60">
          {pending ? "Создаём…" : "Создать анкету"}
        </button>
        <Link href="/admin"
          className="label-caps flex min-h-12 items-center gap-2 text-ink-soft transition-colors duration-300 hover:text-ink">
          <ArrowLeft size={16} aria-hidden="true" />
          Отмена
        </Link>
        <p className="text-sm text-ink-soft">
          Анкета создаётся черновиком — в каталог она попадёт после публикации.
        </p>
      </div>
    </form>
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
