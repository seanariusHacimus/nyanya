"use client";

import { useState } from "react";
import Link from "next/link";
import { Info, MagnifyingGlass, IdentificationBadge } from "@phosphor-icons/react";

const inputClass =
  "min-h-12 w-full border border-line bg-paper px-4 text-base text-ink placeholder:text-ink-faint focus:border-ink";

/** §9 R2 — Регистрация с выбором роли. ⛳ Бэкенда нет: сабмит показывает демо-уведомление. */
export function RegisterForm() {
  const [role, setRole] = useState<"parent" | "specialist">("parent");
  const [demo, setDemo] = useState(false);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setDemo(true);
      }}
      className="space-y-5"
    >
      <div className="grid gap-2">
        <span className="text-sm font-semibold text-ink">Кто вы?</span>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              {
                key: "parent",
                icon: MagnifyingGlass,
                title: "Я родитель",
                text: "Ищу специалиста",
              },
              {
                key: "specialist",
                icon: IdentificationBadge,
                title: "Я специалист",
                text: "Размещаю анкету",
              },
            ] as const
          ).map((option) => (
            <label
              key={option.key}
              className={`flex cursor-pointer flex-col gap-1.5 border p-4 transition-colors duration-300 ${
                role === option.key
                  ? "border-ink bg-cream-deep"
                  : "border-line bg-paper hover:border-ink-faint"
              }`}
            >
              <input
                type="radio"
                name="role"
                value={option.key}
                checked={role === option.key}
                onChange={() => setRole(option.key)}
                className="sr-only"
              />
              <option.icon size={22} weight="thin" className="text-bronze" />
              <span className="text-sm font-semibold text-ink">{option.title}</span>
              <span className="text-xs text-ink-soft">{option.text}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-2">
        <label htmlFor="reg-name" className="text-sm font-semibold text-ink">
          Имя
        </label>
        <input
          id="reg-name"
          type="text"
          required
          autoComplete="name"
          className={inputClass}
          placeholder="Ваше имя"
        />
      </div>
      <div className="grid gap-2">
        <label htmlFor="reg-email" className="text-sm font-semibold text-ink">
          Email
        </label>
        <input
          id="reg-email"
          type="email"
          required
          autoComplete="email"
          className={inputClass}
          placeholder="you@example.com"
        />
      </div>
      <div className="grid gap-2">
        <label htmlFor="reg-phone" className="text-sm font-semibold text-ink">
          Телефон
        </label>
        <input
          id="reg-phone"
          type="tel"
          required
          autoComplete="tel"
          className={inputClass}
          placeholder="+998 __ ___ __ __"
        />
      </div>
      <div className="grid gap-2">
        <label htmlFor="reg-password" className="text-sm font-semibold text-ink">
          Пароль
        </label>
        <input
          id="reg-password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
          placeholder="Не менее 8 символов"
        />
      </div>

      {demo && (
        <p
          role="status"
          className="flex items-start gap-3 border border-bronze/40 bg-cream-deep px-4 py-3 text-sm text-ink"
        >
          <Info size={18} className="mt-0.5 shrink-0 text-bronze" aria-hidden="true" />
          Демо-версия: регистрация заработает после подключения бэкенда.
        </p>
      )}

      <button
        type="submit"
        className="label-caps inline-flex min-h-12 w-full items-center justify-center bg-ink px-8 text-cream transition-colors duration-300 hover:bg-charcoal active:translate-y-px"
      >
        Создать аккаунт
      </button>

      <p className="text-xs leading-relaxed text-ink-soft">
        Регистрируясь, вы принимаете{" "}
        <Link
          href="/terms"
          className="border-b border-ink/30 pb-0.5 text-ink hover:border-bronze hover:text-bronze-text"
        >
          Пользовательское соглашение
        </Link>{" "}
        и{" "}
        <Link
          href="/privacy"
          className="border-b border-ink/30 pb-0.5 text-ink hover:border-bronze hover:text-bronze-text"
        >
          Политику конфиденциальности
        </Link>
        .
      </p>

      <p className="pt-1 text-sm">
        <Link
          href="/login"
          className="border-b border-ink/30 pb-0.5 text-ink transition-colors duration-300 hover:border-bronze hover:text-bronze-text"
        >
          Уже есть аккаунт? Войти
        </Link>
      </p>
    </form>
  );
}
