"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Плавное появление блока при прокрутке — без библиотеки анимаций.
 *
 * Главное правило: **сервер всегда отдаёт блок видимым**. Прежняя версия на
 * `motion` ставила `initial={{ opacity: 0 }}`, и это состояние попадало в
 * серверный HTML: посетитель на слабой сети и робот поисковика видели пустую
 * страницу до загрузки скриптов. Здесь прячет уже браузер и только то, что
 * заведомо ниже окна.
 *
 * Порядок работы после гидратации:
 *   • блок, который в момент монтирования хотя бы частично на экране, не
 *     трогаем вовсе — иначе он мигнёт (был виден → спрятали → показали);
 *   • остальные получают класс `reveal-pending` (мгновенное скрытие,
 *     `transition: none`) и IntersectionObserver с порогом 0.25 — тем же,
 *     что был у `viewport={{ amount: 0.25}}`;
 *   • при входе в поле зрения класс снимается, и переход из `.reveal`
 *     показывает блок. Наблюдатель отключается — появление однократно
 *     (`once: true`).
 *
 * При `prefers-reduced-motion` и в браузере без IntersectionObserver блок
 * просто остаётся видимым.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // уже на экране — прятать нельзя, мигнёт
    if (el.getBoundingClientRect().top < window.innerHeight) return;

    setPending(true);
    const io = new IntersectionObserver(
      (entries) => {
        const shown = entries.some(
          (e) =>
            e.isIntersecting &&
            /**
             * Доля считается от размера самого блока, поэтому у блока выше
             * окна она не дойдёт до 0.25 никогда — второе условие (четверть
             * окна занята) не даёт такому блоку остаться невидимым навсегда.
             */
            (e.intersectionRatio >= 0.25 ||
              e.intersectionRect.height >= window.innerHeight * 0.25)
        );
        if (!shown) return;
        setPending(false);
        io.disconnect();
      },
      { threshold: [0, 0.25] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={["reveal", pending ? "reveal-pending" : null, className]
        .filter(Boolean)
        .join(" ")}
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  );
}
