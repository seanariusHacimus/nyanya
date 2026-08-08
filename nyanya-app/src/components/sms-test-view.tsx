"use client";

import { useState } from "react";
import { CheckCircle, Warning } from "@phosphor-icons/react";
import { authClient } from "@/lib/auth-client";
import { formatPhone, isValidPhone, normalizePhone } from "@/lib/sms/phone";

/**
 * Проверочный стенд SMS-подтверждения.
 *
 * Отдельная страница, а не шаг регистрации: куда именно встроить подтверждение
 * телефона в воронку — продуктовое решение, и принимать его вслепую нельзя.
 * Здесь проверяется только то, что связка «форма → Better Auth → Eskiz →
 * телефон» работает целиком.
 *
 * Номер приводится к каноническому `998XXXXXXXXX` здесь: сервер принимает
 * только его (см. phoneNumberValidator в lib/auth.ts), потому что Better Auth
 * сохраняет номер дословно и сравнивает строками.
 */

const inputClass =
  "min-h-12 w-full border border-line bg-paper px-4 text-base text-ink placeholder:text-ink-faint focus:border-ink";

export function SmsTestView({
  smsLive,
  currentPhone,
  currentVerified,
}: {
  smsLive: boolean;
  currentPhone: string | null;
  currentVerified: boolean;
}) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"phone" | "code" | "done">("phone");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canonical = isValidPhone(phone) ? normalizePhone(phone) : null;

  // Тот же номер, который уже привязан, подтвердить нельзя: плагин считает
  // занятым и его, не исключая самого пользователя. Проверяем до отправки —
  // иначе SMS оплачено, а в ответ «номер занят».
  const alreadyMine = Boolean(
    canonical && currentVerified && canonical === currentPhone
  );

  const sendCode = async () => {
    if (!canonical || alreadyMine) return;
    setBusy(true);
    setError(null);
    const { error: apiError } = await authClient.phoneNumber.sendOtp({
      phoneNumber: canonical,
    });
    setBusy(false);
    if (apiError) {
      setError(apiError.message ?? "Не удалось отправить код.");
      return;
    }
    setStage("code");
  };

  const verify = async () => {
    if (!canonical) return;
    setBusy(true);
    setError(null);
    const { error: apiError } = await authClient.phoneNumber.verify({
      phoneNumber: canonical,
      code,
      // без этого плагин ищет пользователя ПО номеру, а не берёт текущего
      updatePhoneNumber: true,
    });
    setBusy(false);
    if (apiError) {
      setError(apiError.message ?? "Код не подошёл.");
      return;
    }
    setStage("done");
  };

  if (stage === "done") {
    return (
      <div className="flex flex-col items-center border border-bronze bg-cream-deep px-8 py-14 text-center">
        <CheckCircle size={40} weight="thin" className="text-bronze" />
        <p className="mt-5 font-display text-2xl font-medium text-ink">
          Номер подтверждён
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          {formatPhone(canonical ?? phone)} записан в профиль как подтверждённый.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p
        className={`border px-4 py-3 text-sm leading-relaxed ${
          smsLive
            ? "border-bronze/50 bg-cream-deep text-ink"
            : "border-line bg-paper text-ink-soft"
        }`}
      >
        {smsLive
          ? "Шлюз подключён: код уйдёт настоящим SMS и спишет деньги с баланса Eskiz."
          : "Ключи Eskiz не заданы — код никуда не уходит, он печатается в лог сервера."}
      </p>

      {stage === "phone" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendCode();
          }}
          className="space-y-5"
        >
          <div className="grid gap-2">
            <label htmlFor="sms-phone" className="text-sm font-semibold text-ink">
              Номер телефона
            </label>
            <input
              id="sms-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              required
              autoFocus
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+998 90 123-45-67"
              className={inputClass}
            />
            <p className="text-xs text-ink-faint">
              {alreadyMine
                ? "Этот номер уже подтверждён — SMS не нужно. Для повторной проверки возьмите другой номер."
                : canonical
                  ? `Уйдёт на ${canonical}`
                  : "Любой формат — приведём сами. Нужен узбекский номер."}
            </p>
          </div>

          {error && <ErrorLine text={error} />}

          <button
            type="submit"
            disabled={!canonical || alreadyMine || busy}
            className="label-caps inline-flex min-h-12 items-center justify-center bg-ink px-8 text-cream transition-colors duration-300 hover:bg-charcoal disabled:opacity-50"
          >
            {busy ? "Отправляем…" : "Отправить код"}
          </button>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (code.length === 6) void verify();
          }}
          className="space-y-5"
        >
          <p className="text-sm leading-relaxed text-ink-soft">
            Код отправлен на{" "}
            <span className="font-semibold text-ink">
              {formatPhone(canonical ?? phone)}
            </span>
          </p>

          <div className="grid gap-2">
            <label htmlFor="sms-code" className="text-sm font-semibold text-ink">
              Код из SMS
            </label>
            <input
              id="sms-code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="min-h-12 w-full border border-line bg-paper px-4 text-center font-display text-2xl tracking-[0.5em] text-ink focus:border-ink"
            />
          </div>

          {error && <ErrorLine text={error} />}

          <div className="flex flex-wrap gap-4">
            <button
              type="submit"
              disabled={code.length !== 6 || busy}
              className="label-caps inline-flex min-h-12 items-center justify-center bg-ink px-8 text-cream transition-colors duration-300 hover:bg-charcoal disabled:opacity-50"
            >
              {busy ? "Проверяем…" : "Подтвердить"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStage("phone");
                setCode("");
                setError(null);
              }}
              className="label-caps min-h-12 border-b border-ink/30 text-ink transition-colors duration-300 hover:border-bronze hover:text-bronze-text"
            >
              Изменить номер
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function ErrorLine({ text }: { text: string }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-3 border border-[#a5462f]/40 bg-[#a5462f]/5 px-4 py-3 text-sm leading-relaxed text-ink"
    >
      <Warning size={18} className="mt-0.5 shrink-0 text-[#a5462f]" />
      {text}
    </p>
  );
}
