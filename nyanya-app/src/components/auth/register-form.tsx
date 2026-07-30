"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MagnifyingGlass, IdentificationBadge } from "@phosphor-icons/react";
import { authClient } from "@/lib/auth-client";
import { completeProfile } from "@/lib/actions/complete-profile";
import { OtpStep } from "@/components/auth/otp-step";

const inputClass =
  "min-h-12 w-full border border-line bg-paper px-4 text-base text-ink placeholder:text-ink-faint focus:border-ink";

/** §9 R2 — регистрация: роль + данные → код на почту → профиль готов. */
export function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");

  const [step, setStep] = useState<"form" | "otp">("form");
  const [role, setRole] = useState<"parent" | "specialist">("parent");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
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
      setError("Не удалось отправить код. Проверьте адрес и попробуйте ещё раз.");
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

    const result = await completeProfile({ name, phone, role });
    const finalRole = result.ok ? result.role : "parent";
    router.push(
      finalRole === "specialist"
        ? "/specialist"
        : next && next.startsWith("/")
          ? next
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
          setStep("form");
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
          maxLength={100}
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          placeholder="you@example.com"
        />
        <p className="text-xs text-ink-faint">
          Пришлём код подтверждения — пароль не нужен.
        </p>
      </div>

      <div className="grid gap-2">
        <label htmlFor="reg-phone" className="text-sm font-semibold text-ink">
          Телефон
        </label>
        <input
          id="reg-phone"
          type="tel"
          required
          maxLength={20}
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={inputClass}
          placeholder="+998 __ ___ __ __"
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
        {busy ? "Отправляем код…" : "Создать аккаунт"}
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
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className="border-b border-ink/30 pb-0.5 text-ink transition-colors duration-300 hover:border-bronze hover:text-bronze-text"
        >
          Уже есть аккаунт? Войти
        </Link>
      </p>
    </form>
  );
}
