"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Info } from "@phosphor-icons/react";
import {
  getPendingRegistration,
  clearPendingRegistration,
  setSession,
} from "@/lib/demo";

const DEMO_CODE = "123456"; // §9 R3 — демо-подсказка из спецификации; SMS: mock → Eskiz

export function VerifyPhoneForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");

  const [phone, setPhone] = useState("+998 __ ___ __ __");
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [resendIn, setResendIn] = useState(60);

  useEffect(() => {
    const pending = getPendingRegistration();
    if (pending) setPhone(pending.phone);
  }, []);

  // §9 R3 — «Отправить код ещё раз (доступно через 0:60)»
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((v) => v - 1), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (code.trim() !== DEMO_CODE) {
          setError(true);
          return;
        }
        const pending = getPendingRegistration();
        const role = pending?.role ?? "parent";
        setSession({ role, name: pending?.name ?? "Гость" });
        clearPendingRegistration();
        if (role === "specialist") {
          router.push("/specialist");
        } else {
          router.push(next && next.startsWith("/") ? next : "/account");
        }
      }}
      className="space-y-5"
    >
      <p className="text-sm leading-relaxed text-ink-soft">
        Мы отправили код на <span className="font-semibold text-ink">{phone}</span>
      </p>

      <div className="grid gap-2">
        <label htmlFor="otp-code" className="text-sm font-semibold text-ink">
          Код из SMS
        </label>
        <input
          id="otp-code"
          type="text"
          inputMode="numeric"
          maxLength={6}
          required
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, ""));
            setError(false);
          }}
          aria-invalid={error}
          aria-describedby={error ? "otp-error" : undefined}
          className={`min-h-12 w-full border bg-paper px-4 text-center font-display text-2xl tracking-[0.5em] text-ink focus:border-ink ${
            error ? "border-[#a5462f]" : "border-line"
          }`}
          placeholder="······"
        />
        {error && (
          <p id="otp-error" className="text-sm text-[#a5462f]">
            Неверный код. Попробуйте ещё раз.
          </p>
        )}
      </div>

      {/* ⛳ демо-подсказка — удалить при подключении реальных SMS */}
      <p className="flex items-start gap-3 border border-bronze/40 bg-cream-deep px-4 py-3 text-sm text-ink">
        <Info size={18} className="mt-0.5 shrink-0 text-bronze" aria-hidden="true" />
        В демо-режиме используйте код 123456.
      </p>

      <button
        type="submit"
        className="label-caps inline-flex min-h-12 w-full items-center justify-center bg-ink px-8 text-cream transition-colors duration-300 hover:bg-charcoal active:translate-y-px"
      >
        Подтвердить
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-sm">
        {resendIn > 0 ? (
          <span className="text-ink-faint">
            Отправить код ещё раз — через 0:{String(resendIn).padStart(2, "0")}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setResendIn(60)}
            className="border-b border-ink/30 pb-0.5 text-ink transition-colors duration-300 hover:border-bronze hover:text-bronze-text"
          >
            Отправить код ещё раз
          </button>
        )}
        <Link
          href="/register"
          className="border-b border-ink/30 pb-0.5 text-ink transition-colors duration-300 hover:border-bronze hover:text-bronze-text"
        >
          Изменить номер
        </Link>
      </div>
    </form>
  );
}
