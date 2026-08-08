"use client";

import { useEffect, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, X } from "@phosphor-icons/react";
import { easeOutQuart } from "@/lib/motion";

/**
 * Оболочка одного экрана мастера.
 *
 * Экран занимает высоту окна и делится на три части: полоса прогресса
 * сверху, вопрос посередине, кнопки снизу. Смысл в том, чтобы на телефоне
 * ничего не приходилось прокручивать — человек видит один вопрос, отвечает
 * и идёт дальше.
 *
 * Экран накрывает страницу целиком (`fixed inset-0`), а не встраивается в
 * кабинет: иначе к его высоте прибавились бы шапка и подвал сайта, и
 * обещание «ничего не прокручивать» сразу бы нарушилось.
 *
 * Высота считается в `dvh`, а не в `vh`: на мобильных браузерах адресная
 * строка то появляется, то прячется, и `vh` даёт экран выше реального —
 * кнопка «Далее» уезжала бы под край.
 *
 * Середина всё же может прокручиваться (`overflow-y-auto`): на маленьком
 * экране с открытой клавиатурой места не остаётся ни у кого, и честнее
 * дать прокрутку внутри блока, чем обрезать поле ввода.
 */
export function WizardShell({
  step,
  total,
  title,
  hint,
  optional = false,
  canGoNext,
  nextLabel = "Далее",
  onBack,
  onNext,
  onExit,
  busy = false,
  children,
}: {
  /** Номер текущего экрана, начиная с 1. */
  step: number;
  total: number;
  title: string;
  hint?: string;
  optional?: boolean;
  canGoNext: boolean;
  nextLabel?: string;
  onBack: (() => void) | null;
  onNext: () => void;
  onExit: () => void;
  busy?: boolean;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  const percent = Math.round((step / total) * 100);

  // страница под мастером не должна прокручиваться «сквозь» него
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Заполнение анкеты"
      className="fixed inset-0 z-50 flex h-[100dvh] flex-col bg-cream"
    >
      {/* прогресс */}
      <header className="shrink-0 border-b border-line px-5 pt-5 pb-4 sm:px-8">
        <div className="mx-auto flex max-w-[560px] items-center gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-4">
              <p className="label-caps text-bronze-text">
                Шаг {step} из {total}
              </p>
              {optional && (
                <p className="label-caps text-ink-faint">по желанию</p>
              )}
            </div>
            <div
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Прогресс заполнения анкеты"
              className="mt-2.5 h-1 w-full bg-line"
            >
              <div
                className="h-full bg-bronze transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={onExit}
            aria-label="Выйти из заполнения"
            className="-mr-2 flex size-11 shrink-0 items-center justify-center text-ink-soft transition-colors duration-300 hover:text-ink"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      {/* вопрос */}
      <motion.main
        key={step}
        {...(reduce
          ? {}
          : {
              initial: { opacity: 0, x: 24 },
              animate: { opacity: 1, x: 0 },
              transition: { duration: 0.35, ease: easeOutQuart },
            })}
        className="flex flex-1 flex-col overflow-y-auto px-5 py-8 sm:px-8"
      >
        <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col justify-center">
          <h1 className="font-display text-3xl leading-[1.12] font-medium text-ink sm:text-4xl">
            {title}
          </h1>
          {hint && (
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              {hint}
            </p>
          )}
          <div className="mt-8">{children}</div>
        </div>
      </motion.main>

      {/* кнопки */}
      <footer className="shrink-0 border-t border-line bg-paper px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-[560px] items-center gap-4">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              disabled={busy}
              className="label-caps flex min-h-12 shrink-0 items-center gap-2 px-2 text-ink-soft transition-colors duration-300 hover:text-ink disabled:opacity-50"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              <span className="hidden sm:inline">Назад</span>
            </button>
          ) : (
            <span className="min-h-12" />
          )}

          <button
            type="button"
            onClick={onNext}
            disabled={!canGoNext || busy}
            className="label-caps inline-flex min-h-12 flex-1 items-center justify-center gap-3 bg-ink px-6 text-cream transition-colors duration-300 hover:bg-charcoal active:translate-y-px disabled:opacity-40"
          >
            {busy ? "Сохраняем…" : nextLabel}
            {!busy && <ArrowRight size={16} aria-hidden="true" />}
          </button>
        </div>
      </footer>
    </div>
  );
}
