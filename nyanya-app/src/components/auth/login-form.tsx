"use client";

import { useState } from "react";
import Link from "next/link";
import { Info } from "@phosphor-icons/react";

const inputClass =
  "min-h-12 w-full border border-line bg-paper px-4 text-base text-ink placeholder:text-ink-faint focus:border-ink";

/** §9 R1 — Вход. ⛳ Бэкенд-авторизации нет: сабмит показывает демо-уведомление. */
export function LoginForm() {
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
        <label htmlFor="login-email" className="text-sm font-semibold text-ink">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          required
          autoComplete="email"
          className={inputClass}
          placeholder="you@example.com"
        />
      </div>
      <div className="grid gap-2">
        <label htmlFor="login-password" className="text-sm font-semibold text-ink">
          Пароль
        </label>
        <input
          id="login-password"
          type="password"
          required
          autoComplete="current-password"
          className={inputClass}
          placeholder="••••••••"
        />
      </div>

      {demo && (
        <p
          role="status"
          className="flex items-start gap-3 border border-bronze/40 bg-cream-deep px-4 py-3 text-sm text-ink"
        >
          <Info size={18} className="mt-0.5 shrink-0 text-bronze" aria-hidden="true" />
          Демо-версия: вход заработает после подключения бэкенда.
        </p>
      )}

      <button
        type="submit"
        className="label-caps inline-flex min-h-12 w-full items-center justify-center bg-ink px-8 text-cream transition-colors duration-300 hover:bg-charcoal active:translate-y-px"
      >
        Войти
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-sm">
        <Link
          href="/register"
          className="border-b border-ink/30 pb-0.5 text-ink transition-colors duration-300 hover:border-bronze hover:text-bronze-text"
        >
          Нет аккаунта? Зарегистрируйтесь
        </Link>
        <span className="text-ink-faint">Забыли пароль?</span>
      </div>
    </form>
  );
}
