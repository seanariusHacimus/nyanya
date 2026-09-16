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
 *   • блок выше трёх окон тоже не трогаем — см. ниже, наблюдатель не смог бы
 *     его показать;
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
    const box = el.getBoundingClientRect();
    // уже на экране — прятать нельзя, мигнёт
    if (box.top < window.innerHeight) return;
    /**
     * Блок выше четырёх окон не прячем вовсе. Доля пересечения считается от
     * площади самого блока, поэтому у такого блока она не доходит до 0.25
     * никогда, а наблюдатель будит колбэк только на пересечении порога — то
     * есть показать блок стало бы нечему, и он остался бы невидимым навсегда.
     * Проверено: отзывы на главной (шесть карточек в столбик) при окне 360×400
     * так и не появлялись, сколько ни прокручивай; то же самое происходит при
     * увеличении страницы от 200 %. Запас берём втрое, а не вчетверо: блок
     * может подрасти уже после гидратации. Видимое содержимое важнее анимации.
     */
    if (box.height > window.innerHeight * 3) return;

    setPending(true);
    const io = new IntersectionObserver(
      (entries) => {
        const shown = entries.some(
          (e) =>
            e.isIntersecting &&
            // запасное условие на случай блока, подросшего после гидратации:
            // четверть окна занята — значит блок уже прочитать можно
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
