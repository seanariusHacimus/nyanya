"use client";

import { useState } from "react";
import { CheckCircle } from "@phosphor-icons/react";

/**
 * ⛳ D33: форма → пересылка на email; бэкенда пока нет — отправка имитируется,
 * подключить реальную доставку до запуска (backlog).
 */
export function ContactForm() {
  const [sent, setSent] = useState(false);

  if (sent) {
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
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
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
          autoComplete="name"
          className="min-h-12 border border-line bg-paper px-4 text-base text-ink placeholder:text-ink-faint focus:border-ink"
          placeholder="Как к вам обращаться"
        />
      </div>
      <div className="grid gap-2">
        <label htmlFor="cf-contact" className="text-sm font-semibold text-ink">
          Телефон или email
        </label>
        <input
          id="cf-contact"
          name="contact"
          type="text"
          required
          autoComplete="tel"
          className="min-h-12 border border-line bg-paper px-4 text-base text-ink placeholder:text-ink-faint focus:border-ink"
          placeholder="+998 __ ___ __ __"
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
          rows={5}
          className="border border-line bg-paper px-4 py-3 text-base text-ink placeholder:text-ink-faint focus:border-ink"
          placeholder="Чем мы можем помочь?"
        />
      </div>
      <button
        type="submit"
        className="label-caps inline-flex min-h-12 items-center justify-center bg-ink px-8 text-cream transition-colors duration-300 hover:bg-charcoal active:translate-y-px"
      >
        Отправить
      </button>
    </form>
  );
}
