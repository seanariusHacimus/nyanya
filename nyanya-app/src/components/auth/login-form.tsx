"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";

const inputClass =
  "min-h-12 w-full border border-line bg-paper px-4 text-base text-ink placeholder:text-ink-faint focus:border-ink";

/**
 * §9 R1 — вход по почте и паролю.
 *
 * ⛳ Раньше вход был беспарольным (код на почту). Шаг с кодом убран, пока
 * не подтверждён домен отправки — см. комментарий в lib/auth.ts.
 */
export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);

    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
    });

    if (signInError) {
      setBusy(false);
      // заблокированному аккаунту Better Auth отвечает 403 (§9 R1)
      setError(
        signInError.status === 403
          ? "Аккаунт заблокирован. Свяжитесь с поддержкой."
          : "Неверная почта или пароль."
      );
      return;
    }

    // роль — из свежей сессии: она определяет, куда вести после входа.
    // Администратора раньше отправляло в /account, как родителя, и панель
    // приходилось искать по прямому адресу.
    const { data } = await authClient.getSession();
    const role = data?.user.role;
    const home =
      role === "admin" ? "/admin" : role === "specialist" ? "/specialist" : "/account";
    router.push(next && next.startsWith("/") ? next : home);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          placeholder="you@example.com"
        />
      </div>

      <div className="grid gap-2">
        <label
          htmlFor="login-password"
          className="text-sm font-semibold text-ink"
        >
          Пароль
        </label>
        <input
          id="login-password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
          placeholder="••••••••"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-[#a5462f]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="label-caps inline-flex min-h-12 w-full items-center justify-center bg-ink px-8 text-cream transition-colors duration-300 hover:bg-charcoal active:translate-y-px disabled:opacity-70"
      >
        {busy ? "Входим…" : "Войти"}
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
    </form>
  );
}
