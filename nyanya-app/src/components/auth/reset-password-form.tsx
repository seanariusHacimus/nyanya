"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { safeNext } from "@/lib/safe-next";
import { OtpStep } from "@/components/auth/otp-step";
import { PasswordInput } from "@/components/auth/password-input";

const inputClass =
  "min-h-12 w-full border border-line bg-paper px-4 text-base text-ink placeholder:text-ink-faint focus:border-ink";

const MIN_PASSWORD = 8; // должно совпадать с minPasswordLength в lib/auth.ts

/**
 * Восстановление пароля: адрес → код из письма → новый пароль.
 *
 * Код проверяется отдельным шагом (`checkVerificationOtp`), который его не
 * тратит: иначе человек узнавал бы об опечатке в коде только после того, как
 * придумал и дважды набрал пароль. Тратит код последний запрос — тот, что
 * пароль и меняет.
 *
 * Существование аккаунта форма не выдаёт: шаг с кодом открывается для любого
 * адреса, а «нет такого пользователя» и «неверный код» показываются одним и
 * тем же текстом. Иначе страница стала бы удобным способом проверять, кто
 * зарегистрирован на сайте.
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));

  const [step, setStep] = useState<"email" | "otp" | "password">("email");
  // адрес не принимаем параметром ссылки: он осел бы в истории браузера и в
  // журналах сервера — почта пользователя там ни к чему
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Шаг 1 — запрос кода. Ответ одинаков для любого адреса. */
  const sendCode = async () => {
    setBusy(true);
    setError(null);
    const { error: sendError } = await authClient.emailOtp.requestPasswordReset({
      email,
    });
    setBusy(false);
    if (sendError) {
      setError(
        sendError.status === 429
          ? "Слишком много запросов. Подождите минуту и попробуйте ещё раз."
          : "Не удалось отправить код. Проверьте адрес и попробуйте ещё раз."
      );
      return;
    }
    setStep("otp");
  };

  /** Шаг 2 — проверка кода, не расходуя его. */
  const verify = async (code: string) => {
    setBusy(true);
    setError(null);
    const { error: checkError } =
      await authClient.emailOtp.checkVerificationOtp({
        email,
        otp: code,
        type: "forget-password",
      });
    setBusy(false);
    if (checkError) {
      setError(codeError(checkError.code));
      return;
    }
    setOtp(code);
    setStep("password");
  };

  /** Шаг 3 — новый пароль; код расходуется здесь. */
  const submitPassword = async () => {
    if (password.length < MIN_PASSWORD) {
      setError(`Пароль должен быть не короче ${MIN_PASSWORD} символов.`);
      return;
    }

    setBusy(true);
    setError(null);
    const { error: resetError } = await authClient.emailOtp.resetPassword({
      email,
      otp,
      password,
    });

    if (resetError) {
      setBusy(false);
      // код мог истечь, пока человек придумывал пароль — возвращаем к вводу кода
      setStep("otp");
      setError(codeError(resetError.code));
      return;
    }

    // Пароль уже новый — просить его ввести ещё раз на странице входа незачем.
    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
    });
    setBusy(false);
    if (signInError) {
      router.push("/login");
      return;
    }

    const { data } = await authClient.getSession();
    const role = data?.user.role;
    const home =
      role === "admin" ? "/admin" : role === "specialist" ? "/specialist" : "/account";
    router.push(next ?? home);
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
        lead={
          <>
            Если аккаунт на <span className="font-semibold text-ink">{email}</span>{" "}
            существует, код уже отправлен на этот адрес.
          </>
        }
      />
    );
  }

  if (step === "password") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submitPassword();
        }}
        className="space-y-5"
      >
        <p className="text-sm leading-relaxed text-ink-soft">
          Код принят. Придумайте новый пароль для{" "}
          <span className="font-semibold text-ink">{email}</span>
        </p>

        {/*
          Скрытое поле логина. Менеджеру паролей нужно знать, к какому аккаунту
          относится пароль: без него он не предлагает сохранить или обновить
          запись — а не сохранённый пароль и есть та причина, по которой люди
          приходят на эту страницу.
        */}
        <input
          type="email"
          name="email"
          value={email}
          readOnly
          tabIndex={-1}
          aria-hidden="true"
          autoComplete="username"
          className="sr-only"
        />

        <div className="grid gap-2">
          <label
            htmlFor="reset-password"
            className="text-sm font-semibold text-ink"
          >
            Новый пароль
          </label>
          <PasswordInput
            id="reset-password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            required
            autoFocus
            minLength={MIN_PASSWORD}
            describedBy="reset-password-hint"
          />
          <p id="reset-password-hint" className="text-xs text-ink-faint">
            Не короче {MIN_PASSWORD} символов.
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
          {busy ? "Сохраняем…" : "Сохранить и войти"}
        </button>

        <p className="text-xs leading-relaxed text-ink-faint">
          После смены пароля вход на других устройствах прекратится — там
          понадобится войти заново.
        </p>
      </form>
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
      <p className="text-sm leading-relaxed text-ink-soft">
        Укажите почту, на которую зарегистрирован аккаунт. Мы пришлём код для
        смены пароля.
      </p>

      <div className="grid gap-2">
        <label htmlFor="reset-email" className="text-sm font-semibold text-ink">
          Email
        </label>
        <input
          id="reset-email"
          type="email"
          required
          autoFocus
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          placeholder="you@example.com"
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
        {busy ? "Отправляем…" : "Прислать код"}
      </button>

      <div className="border-t border-line pt-5 text-center">
        <Link
          href="/login"
          className="text-sm text-ink-soft transition-colors duration-300 hover:text-bronze-text"
        >
          Вспомнили пароль? Войти
        </Link>
      </div>
    </form>
  );
}

/**
 * Ответы сервера — человеческим языком.
 *
 * «Пользователь не найден» намеренно звучит как «неверный код»: сообщать
 * об отсутствии аккаунта здесь означало бы отдать любому желающему список
 * почт, зарегистрированных на сайте.
 */
function codeError(code: string | undefined): string {
  switch (code) {
    case "OTP_EXPIRED":
      return "Код устарел. Запросите новый.";
    case "TOO_MANY_ATTEMPTS":
      return "Слишком много попыток. Запросите новый код.";
    default:
      return "Неверный или устаревший код. Проверьте письмо и попробуйте ещё раз.";
  }
}
