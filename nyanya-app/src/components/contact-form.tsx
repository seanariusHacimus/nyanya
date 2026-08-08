"use client";

import { useState } from "react";
import { CheckCircle, CircleNotch, Warning } from "@phosphor-icons/react";

type State = "idle" | "sending" | "sent" | "error";

const inputClass =
  "min-h-12 w-full border border-line bg-paper px-4 text-base text-ink placeholder:text-ink-faint focus:border-ink";

/**
 * §15 CT3 — форма обращения. Отправляется на /api/contact, оттуда сервер
 * письмом через Resend на адрес владельца (CONTACT_EMAIL_TO).
 */
export function ContactForm() {
  const [state, setState] = useState<State>("idle");
  const [errorText, setErrorText] = useState("");

  if (state === "sent") {
    return (
      <div
        role="status"
        className="flex min-h-64 flex-col items-center justify-center rounded-[2px] bg-cream-deep px-8 py-14 text-center"
      >
        <CheckCircle size={40} weight="thin" className="text-bronze" />
        <p className="mt-5 font-display text-2xl font-medium text-ink">
          Сообщение отправлено
        </p>
        <p className="mt-2 text-sm text-ink-soft">Мы свяжемся с вами.</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = new FormData(form);
        setState("sending");
        setErrorText("");

        try {
          const res = await fetch("/api/contact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: data.get("name"),
              contact: data.get("contact"),
              message: data.get("message"),
              company: data.get("company"), // honeypot
            }),
          });
          const json = await res.json().catch(() => ({ ok: false }));

          if (res.ok && json.ok) {
            setState("sent");
            return;
          }

          setState("error");
          setErrorText(
            json.error === "rate_limited"
              ? "Слишком много обращений подряд. Попробуйте через несколько минут."
              : "Не удалось отправить сообщение. Попробуйте ещё раз через минуту."
          );
        } catch {
          setState("error");
          setErrorText(
            "Не удалось отправить сообщение. Попробуйте ещё раз через минуту."
          );
        }
      }}
      className="space-y-6"
    >
      <div className="grid gap-2">
        <label htmlFor="cf-name" className="text-sm font-semibold text-ink">
          Имя
        </label>
        <input
          id="cf-name"
          name="name"
          type="text"
          required
          maxLength={100}
          autoComplete="name"
          className={inputClass}
          placeholder="Как к вам обращаться"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="cf-contact" className="text-sm font-semibold text-ink">
          Email или Telegram
        </label>
        <input
          id="cf-contact"
          name="contact"
          type="text"
          required
          maxLength={120}
          autoComplete="email"
          className={inputClass}
          placeholder="you@example.com или @username"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="cf-message" className="text-sm font-semibold text-ink">
          Сообщение
        </label>
        <textarea
          id="cf-message"
          name="message"
          required
          maxLength={2000}
          rows={5}
          className="border border-line bg-paper px-4 py-3 text-base text-ink placeholder:text-ink-faint focus:border-ink"
          placeholder="Чем мы можем помочь?"
        />
      </div>

      {/* ловушка для спам-ботов: человек это поле не видит и не заполняет */}
      <div aria-hidden="true" className="hidden">
        <label htmlFor="cf-company">Компания</label>
        <input id="cf-company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {state === "error" && (
        <p
          role="alert"
          className="flex items-start gap-3 border border-[#a5462f]/40 bg-[#a5462f]/5 px-4 py-3 text-sm leading-relaxed text-ink"
        >
          <Warning size={18} className="mt-0.5 shrink-0 text-[#a5462f]" />
          {errorText}
        </p>
      )}

      <button
        type="submit"
        disabled={state === "sending"}
        className="label-caps inline-flex min-h-12 items-center justify-center gap-2 bg-ink px-8 text-cream transition-colors duration-300 hover:bg-charcoal active:translate-y-px disabled:opacity-70"
      >
        {state === "sending" && (
          <CircleNotch size={16} className="animate-spin" aria-hidden="true" />
        )}
        {state === "sending" ? "Отправляем…" : "Отправить"}
      </button>
    </form>
  );
}
