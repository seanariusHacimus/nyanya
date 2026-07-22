"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <main className="flex flex-1 items-center">
      <div className="mx-auto max-w-[1400px] px-5 py-28 text-center sm:px-8">
        <p className="label-caps text-bronze-text">Ошибка</p>
        <h1 className="mt-6 font-display text-4xl leading-[1.12] font-medium text-ink sm:text-5xl">
          Что-то пошло не так.
        </h1>
        <p className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-ink-soft">
          Обновите страницу — обычно этого достаточно.
        </p>
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="label-caps inline-flex min-h-12 items-center justify-center bg-ink px-8 text-cream transition-colors duration-300 hover:bg-charcoal active:translate-y-px"
          >
            Обновить
          </button>
        </div>
      </div>
    </main>
  );
}
