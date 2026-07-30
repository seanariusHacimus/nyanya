"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { OtpStep } from "@/components/auth/otp-step";

const inputClass =
  "min-h-12 w-full border border-line bg-paper px-4 text-base text-ink placeholder:text-ink-faint focus:border-ink";

/** §9 R1 — вход без пароля: почта → код из письма → сессия. */
export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");

  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async () => {
    setBusy(true);
    setError(null);
    const { error: sendError } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "sign-in",
    });
    setBusy(false);
    if (sendError) {
      setError("Не удалось отправить код. Попробуйте ещё раз.");
      return;
    }
    setStep("otp");
  };

  const verify = async (code: string) => {
    setBusy(true);
    setError(null);
    const { error: signInError } = await authClient.signIn.emailOtp({
      email,
      otp: code,
    });
    if (signInError) {
      setBusy(false);
      setError("Неверный или устаревший код. Попробуйте ещё раз.");
      return;
    }
    // роль — из свежей сессии: она определяет, в какой кабинет вести
    const { data } = await authClient.getSession();
    const role = data?.user.role === "specialist" ? "specialist" : "parent";
    router.push(
      next && next.startsWith("/")
        ? next
        : role === "specialist"
          ? "/specialist"
          : "/account"
    );
  };

  if (step === "otp") {
    return (
      <OtpStep
        email={email}
        busy={busy}
        error={error}
        onVerify={verify}
        onResend={sendCode}
        onChangeEmail={() => {
          setStep("email");
          setError(null);
        }}
      />
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void sendCode();
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
        <p className="text-xs text-ink-faint">
          Пароль не нужен — пришлём код подтверждения на почту.
        </p>
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
        {busy ? "Отправляем код…" : "Получить код"}
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
