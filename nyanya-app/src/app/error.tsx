"use client";

import { useEffect } from "react";

/**
 * Экран ошибки.
 *
 * Кнопка делает полную перезагрузку, а не `reset()`. Самая частая причина
 * попасть сюда — выкатили новую версию, а вкладка осталась открытой на
 * старой: серверное действие с прежним идентификатором в новой сборке уже
 * не существует («Failed to find Server Action»). `reset()` в этом случае
 * бесполезен — он перерисовывает то же самое устаревшее приложение,
 * помогает только загрузка свежих файлов.
 *
 * В production Next скрывает текст ошибки и оставляет только digest,
 * поэтому мы не пытаемся различать причины: полная перезагрузка чинит и
 * этот случай, и обычный временный сбой.
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
          Чаще всего это значит, что сайт обновился, пока страница была
          открыта. Перезагрузите её — введённые данные придётся указать
          заново, но всё сохранённое на месте.
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
        </div>
      </div>
    </main>
  );
}
