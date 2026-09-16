"use client";

import { useState } from "react";
import { CheckCircle, CircleNotch, Star, Warning } from "@phosphor-icons/react";

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
  /**
   * Оценка сервиса — необязательная. Люди пишут сюда и с вопросом, и с
   * благодарностью, и с жалобой; требовать звёзды от человека, который просто
   * спрашивает про район работы, незачем.
   */
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

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
              rating, // оценка сервиса, 0 — не поставлена
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
              ? "Слишком много обращений подряд. Попробуйте через час."
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

      <fieldset className="grid gap-2">
        <legend className="text-sm font-semibold text-ink">
          Оценка сервиса{" "}
          <span className="font-normal text-ink-faint">— по желанию</span>
        </legend>
        <div
          className="mt-1 flex items-center gap-1"
          onMouseLeave={() => setHoverRating(0)}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`Оценка ${n} из 5`}
              aria-pressed={rating === n}
              onMouseEnter={() => setHoverRating(n)}
              onFocus={() => setHoverRating(n)}
              onClick={() => setRating(rating === n ? 0 : n)}
              className="p-1 transition-transform duration-200 hover:scale-110"
            >
              <Star
                size={26}
                weight={n <= (hoverRating || rating) ? "fill" : "regular"}
                className={
                  n <= (hoverRating || rating) ? "text-bronze" : "text-ink-faint"
                }
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-3 text-sm text-ink-soft">{rating} из 5</span>
          )}
        </div>
        <p className="text-xs text-ink-faint">
          Оценка приходит нам вместе с сообщением и в каталоге не публикуется.
        </p>
      </fieldset>

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
