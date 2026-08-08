"use client";

/**
 * Общий прогресс заполнения.
 *
 * Держится у верхнего края экрана, пока человек листает шаги: главный страх
 * при длинной форме — «сколько ещё осталось», и ответ должен быть виден в
 * любой момент, а не только на самом верху страницы.
 */
export function WizardProgress({
  done,
  total,
  label,
}: {
  done: number;
  total: number;
  /** Что делать дальше — короткой строкой. */
  label: string;
}) {
  const percent = total ? Math.round((done / total) * 100) : 0;
  const complete = done === total;

  return (
    <div className="sticky top-0 z-20 -mx-5 border-b border-line bg-cream/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p className="text-sm font-semibold text-ink">
          {complete ? "Всё заполнено" : label}
        </p>
        <p className="label-caps text-bronze-text">
          {done} из {total}
        </p>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Прогресс заполнения анкеты"
        className="mt-3 h-1 w-full bg-line"
      >
        <div
          className="h-full bg-bronze transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
