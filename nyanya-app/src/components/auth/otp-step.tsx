"use client";

import { useEffect, useState } from "react";
import { Info } from "@phosphor-icons/react";

/** Общий шаг ввода кода из письма (§9 R3): таймер повтора, ошибки, доступность. */
export function OtpStep({
  email,
  onVerify,
  onResend,
  onChangeEmail,
  busy,
  error,
}: {
  email: string;
  onVerify: (code: string) => void;
  onResend: () => void;
  onChangeEmail: () => void;
  busy: boolean;
  error: string | null;
}) {
  const [code, setCode] = useState("");
  const [resendIn, setResendIn] = useState(60);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((v) => v - 1), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (code.length === 6) onVerify(code);
      }}
      className="space-y-5"
    >
      <p className="text-sm leading-relaxed text-ink-soft">
        Мы отправили код на{" "}
        <span className="font-semibold text-ink">{email}</span>
      </p>

      <div className="grid gap-2">
        <label htmlFor="otp-code" className="text-sm font-semibold text-ink">
          Код из письма
        </label>
        <input
          id="otp-code"
          type="text"
          inputMode="numeric"
          maxLength={6}
          required
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "otp-error" : undefined}
          className={`min-h-12 w-full border bg-paper px-4 text-center font-display text-2xl tracking-[0.5em] text-ink focus:border-ink ${
            error ? "border-[#a5462f]" : "border-line"
          }`}
          placeholder="······"
        />
        {error && (
          <p id="otp-error" role="alert" className="text-sm text-[#a5462f]">
            {error}
          </p>
        )}
      </div>

      <p className="flex items-start gap-3 border border-line bg-cream-deep/60 px-4 py-3 text-xs leading-relaxed text-ink-soft">
        <Info size={16} className="mt-0.5 shrink-0 text-bronze" aria-hidden="true" />
        Если писем несколько, введите код из самого свежего — предыдущие
        перестают действовать. Код живёт 10 минут; письмо может попасть в «Спам».
      </p>

      <button
        type="submit"
        disabled={busy || code.length !== 6}
        className="label-caps inline-flex min-h-12 w-full items-center justify-center bg-ink px-8 text-cream transition-colors duration-300 hover:bg-charcoal active:translate-y-px disabled:opacity-70"
      >
        {busy ? "Проверяем…" : "Подтвердить"}
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-sm">
        {resendIn > 0 ? (
          <span className="text-ink-faint">
            Отправить ещё раз — через 0:{String(resendIn).padStart(2, "0")}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => {
              onResend();
              setResendIn(60);
            }}
            className="border-b border-ink/30 pb-0.5 text-ink transition-colors duration-300 hover:border-bronze hover:text-bronze-text"
          >
            Отправить код ещё раз
          </button>
        )}
        <button
          type="button"
          onClick={onChangeEmail}
          className="border-b border-ink/30 pb-0.5 text-ink transition-colors duration-300 hover:border-bronze hover:text-bronze-text"
        >
          Изменить почту
        </button>
      </div>
    </form>
  );
}
