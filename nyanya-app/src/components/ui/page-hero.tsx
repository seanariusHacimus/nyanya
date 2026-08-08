import type { ReactNode } from "react";

/** Единая шапка внутренних страниц: серифный H1 + подзаголовок. */
export function PageHero({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[1400px] px-5 pt-14 pb-4 sm:px-8 lg:pt-20">
      <h1 className="max-w-2xl font-display text-4xl leading-[1.08] font-medium tracking-[-0.01em] text-ink sm:text-5xl lg:text-6xl">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
          {subtitle}
        </p>
      )}
      {children}
    </div>
  );
}
