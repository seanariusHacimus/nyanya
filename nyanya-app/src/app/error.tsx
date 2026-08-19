"use client";

import { useEffect } from "react";

/**
 * Экран ошибки — последняя линия, а не рабочий инструмент.
 *
 * Текст здесь долго утверждал, что «сайт обновился, пока страница была
 * открыта». Это был неверный вывод: на деле сюда чаще всего приводила
 * загрузка фотографии тяжелее лимита тела серверного действия, и совет
 * перезагрузить страницу не помогал ничем — при следующей попытке
 * повторялось то же самое. Причина устранена (`serverActions.bodySizeLimit`
 * в next.config.ts плюс проверка размера в браузере), а обещание, которое
 * мы не можем подтвердить, из текста убрано.
 *
 * Кнопка делает полную перезагрузку, а не `reset()`: если сюда всё же
 * привела устаревшая вкладка после выката, `reset()` перерисует то же самое
 * старое приложение, помогает только загрузка свежих файлов.
 *
 * В production Next скрывает текст ошибки и оставляет только digest — по
 * нему ошибка находится в логах сервера.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // digest виден в логах сервера — по нему находится исходная ошибка
    console.error("[error boundary]", error.digest ?? error.message);
  }, [error]);

  return (
    <main className="flex flex-1 items-center">
      <div className="mx-auto max-w-[1400px] px-5 py-28 text-center sm:px-8">
        <p className="label-caps text-bronze-text">Ошибка</p>
        <h1 className="mt-6 font-display text-4xl leading-[1.12] font-medium text-ink sm:text-5xl">
          Что-то пошло не так.
        </h1>
        <p className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-ink-soft">
          Всё сохранённое на месте. Перезагрузите страницу — данные, которые
          вы не успели сохранить, придётся ввести заново. Если повторяется —
          напишите нам, мы разберёмся.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="label-caps inline-flex min-h-12 items-center justify-center bg-ink px-8 text-cream transition-colors duration-300 hover:bg-charcoal active:translate-y-px"
          >
            Перезагрузить страницу
          </button>
          <button
            type="button"
            onClick={() => reset()}
            className="label-caps border-b border-ink/30 pb-1 text-ink transition-colors duration-300 hover:border-bronze hover:text-bronze-text"
          >
            Попробовать ещё раз
          </button>
          <a
            href="/contacts"
            className="label-caps border-b border-ink/30 pb-1 text-ink transition-colors duration-300 hover:border-bronze hover:text-bronze-text"
          >
            Написать нам
          </a>
        </div>
      </div>
    </main>
  );
}
