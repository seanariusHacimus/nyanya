import Image from "next/image";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { hero } from "@/content/home";
import { ButtonLink } from "@/components/ui/button-link";
import { TrustSeal } from "@/components/trust-seal";

/**
 * Первый экран. **Серверный компонент**: ни одна его часть не ждёт
 * JavaScript.
 *
 * Раньше вход был на `motion`, и начальное состояние `opacity: 0` уезжало в
 * серверный HTML — главная картинка (она же LCP) появлялась не раньше, чем
 * браузер скачает и выполнит все скрипты страницы. Теперь вход — CSS-анимация
 * (`.enter`, 0.8 с, класс из globals.css): она начинается на первом кадре, в
 * разметке нет ни одного `opacity:0`, а при «уменьшить движение» просто
 * выключается.
 *
 * `preload` у картинки — это то, чем в Next 16 заменили устаревший `priority`
 * (node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md):
 * в `<head>` добавляется `<link rel="preload">`, и снимок начинает грузиться
 * до разбора разметки.
 */
export function Hero() {
  return (
    <section className="mx-auto max-w-[1400px] px-5 sm:px-8">
      <div className="grid items-center gap-12 pt-10 pb-16 lg:grid-cols-2 lg:gap-10 lg:pt-20 lg:pb-28">
        <div className="max-w-xl">
          {/*
            Отдельный крупный заголовок убран по решению владельца, и на первом
            экране осталась одна эта строка. Мелким шрифтом она не держала
            экран: слева оставалась почти пустая колонка против большой
            фотографии, а следующий блок кричал крупной подачей. Поэтому строка
            набрана крупно и стала <h1> — текст тот же, ничего не дописано, а
            страница снова начинается с заголовка первого уровня, как и нужно
            поиску и экранным дикторам.
          */}
          <h1 className="enter max-w-lg font-display text-3xl leading-[1.16] font-medium tracking-[-0.01em] text-ink sm:text-4xl xl:text-[2.75rem]">
            {hero.eyebrow}
          </h1>
          <span
            aria-hidden="true"
            style={{ animationDelay: "0.06s" }}
            className="enter mt-8 block h-px w-24 bg-bronze"
          />
          <div style={{ animationDelay: "0.2s" }} className="enter mt-10">
            <ButtonLink href={hero.primary.href} className="gap-4">
              {hero.primary.label}
              <ArrowRight size={18} aria-hidden="true" />
            </ButtonLink>
          </div>
        </div>

        <div className="enter-image relative mx-auto w-full max-w-[420px] sm:max-w-[500px] lg:max-w-none">
          <Image
            src={hero.image.src}
            alt={hero.image.alt}
            preload
            placeholder="blur"
            sizes="(max-width: 1024px) 92vw, 46vw"
            className="hero-mask h-auto w-full"
          />
          <div className="enter-seal absolute bottom-[7%] right-2 size-32 sm:right-0 sm:size-36 xl:-right-4 xl:size-44">
            <div className="relative size-full">
              <TrustSeal words={hero.seal} className="relative block size-full" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
