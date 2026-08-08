"use client";

import type { ReactNode } from "react";
import { CheckCircle, PencilSimple } from "@phosphor-icons/react";

/**
 * Шаг заполнения анкеты.
 *
 * Заполненный шаг сворачивается в одну строку со сводкой того, что человек
 * ввёл, — так видно пройденный путь и не приходится листать простыню полей.
 * Открыт всегда ровно один шаг; остальные можно открыть щелчком, потому что
 * запрет возвращаться назад раздражает сильнее, чем помогает.
 *
 * Заголовок — кнопка, а не div с onClick: шаги должны открываться с
 * клавиатуры и объявляться экранным читателем как раскрывающийся блок.
 */
export function WizardStep({
  number,
  title,
  hint,
  optional = false,
  done,
  open,
  summary,
  onOpen,
  children,
}: {
  number: number;
  title: string;
  hint: string;
  /** Шаг можно оставить пустым — отмечаем словом, а не молчанием. */
  optional?: boolean;
  done: boolean;
  open: boolean;
  /** Что показать в свёрнутом виде: короткая выжимка введённого. */
  summary: string;
  onOpen: () => void;
  children: ReactNode;
}) {
  const box = open
    ? "border-ink bg-paper"
    : done
      ? "border-bronze/40 bg-cream-deep"
      : "border-line bg-paper";

  return (
    <li className={`border transition-colors duration-300 ${box}`}>
      <h3>
        <button
          type="button"
          onClick={onOpen}
          aria-expanded={open}
          className="flex w-full items-start gap-4 p-6 text-left sm:p-7"
        >
          <span aria-hidden="true" className="mt-0.5 shrink-0">
            {done ? (
              <CheckCircle size={28} weight="fill" className="text-bronze" />
            ) : (
              <span
                className={`flex size-7 items-center justify-center rounded-full border font-display text-sm ${
                  open
                    ? "border-ink text-ink"
                    : "border-line text-ink-faint"
                }`}
              >
                {number}
              </span>
            )}
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-display text-xl font-medium text-ink">
                {title}
              </span>
              {optional && !done && (
                <span className="label-caps text-ink-faint">по желанию</span>
              )}
            </span>
            <span className="mt-1.5 block text-sm leading-relaxed text-ink-soft">
              {done && !open ? summary : hint}
            </span>
          </span>

          {done && !open && (
            <span className="label-caps flex shrink-0 items-center gap-1.5 text-ink-soft">
              <PencilSimple size={14} aria-hidden="true" />
              <span className="hidden sm:inline">Изменить</span>
            </span>
          )}
        </button>
      </h3>

      {open && <div className="px-6 pb-7 sm:px-7">{children}</div>}
    </li>
  );
}
