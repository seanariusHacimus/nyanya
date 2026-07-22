"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Info } from "@phosphor-icons/react";
import { setSession } from "@/lib/demo";

const inputClass =
  "min-h-12 w-full border border-line bg-paper px-4 text-base text-ink placeholder:text-ink-faint focus:border-ink";

/**
 * §9 R1 — Вход. ⛳ Демо-режим: любой email/пароль создают локальную сессию
 * родителя (специалисты приходят через регистрацию с выбором роли).
 */
export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSession({ role: "parent", name: "Алия Каримова" });
        router.push(next && next.startsWith("/") ? next : "/account");
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

      <p className="flex items-start gap-3 border border-line bg-cream-deep/60 px-4 py-3 text-xs leading-relaxed text-ink-soft">
        <Info size={16} className="mt-0.5 shrink-0 text-bronze" aria-hidden="true" />
        Демо-режим: подойдут любые данные, сессия хранится только в вашем
        браузере.
      </p>

      <button
        type="submit"
        className="label-caps inline-flex min-h-12 w-full items-center justify-center bg-ink px-8 text-cream transition-colors duration-300 hover:bg-charcoal active:translate-y-px"
      >
        Войти
      </button>

      <div className="border-t border-line pt-5">
        <p className="text-center text-sm text-ink-soft">Нет аккаунта?</p>
        <Link
          href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"}
          className="label-caps mt-3 inline-flex min-h-12 w-full items-center justify-center border border-ink text-ink transition-colors duration-300 hover:bg-ink hover:text-cream"
        >
          Зарегистрироваться
        </Link>
      </div>

      <p className="pt-1 text-center text-sm text-ink-faint">Забыли пароль?</p>
    </form>
  );
}
