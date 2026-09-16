"use client";

import { useRef, useState } from "react";
import { Eye, EyeSlash } from "@phosphor-icons/react";

/**
 * Поле пароля с переключателем видимости.
 *
 * Маскировка защищает от чужого взгляда через плечо, но она же — частая
 * причина опечаток: человек не видит, что набрал, и узнаёт об ошибке только по
 * отказу во входе. Особенно на телефоне, где промахнуться по клавише легко.
 * Поэтому показывать пароль можно, но по осознанному нажатию и никогда по
 * умолчанию.
 *
 * После переключения фокус возвращается в поле: на телефоне иначе закрылась бы
 * клавиатура и набор пришлось бы начинать заново.
 */
export function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  required = false,
  minLength,
  autoFocus = false,
  placeholder = "••••••••",
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** «current-password» при входе, «new-password» при регистрации и смене. */
  autoComplete: "current-password" | "new-password";
  required?: boolean;
  minLength?: number;
  autoFocus?: boolean;
  placeholder?: string;
  describedBy?: string;
}) {
  const [visible, setVisible] = useState(false);
  const field = useRef<HTMLInputElement>(null);

  return (
    <div className="relative">
      <input
        ref={field}
        id={id}
        name="password"
        type={visible ? "text" : "password"}
        required={required}
        minLength={minLength}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        aria-describedby={describedBy}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-12 w-full border border-line bg-paper px-4 pr-14 text-base text-ink placeholder:text-ink-faint focus:border-ink"
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={() => {
          setVisible((v) => !v);
          field.current?.focus();
        }}
        aria-label={visible ? "Скрыть пароль" : "Показать пароль"}
        aria-pressed={visible}
        title={visible ? "Скрыть пароль" : "Показать пароль"}
        className="absolute inset-y-0 right-0 flex w-14 items-center justify-center text-ink-faint transition-colors duration-300 hover:text-ink focus-visible:text-ink"
      >
        {visible ? (
          <EyeSlash size={20} aria-hidden="true" />
        ) : (
          <Eye size={20} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
