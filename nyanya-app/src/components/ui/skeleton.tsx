/**
 * Каркасы загрузки (Ф8). Динамические страницы ходят в базу, и до этого
 * пользователь видел пустой экран — теперь виден силуэт будущего контента.
 *
 * Серверный компонент: анимация чисто на CSS, состояния нет.
 */

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-ink/[0.06] ${className}`}
    />
  );
}

/** Обёртка страницы: сообщает вспомогательным технологиям, что идёт загрузка. */
export function SkeletonPage({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex-1" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      {children}
    </main>
  );
}

/** Карточка специалиста в каталоге. */
export function SkeletonCard() {
  return (
    <div className="border border-line bg-paper">
      <Skeleton className="aspect-[4/5] w-full" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}
