"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { List, X, CaretDown } from "@phosphor-icons/react";
import { nav } from "@/content/home";
import { easeOutQuart } from "@/lib/motion";
import { ButtonLink } from "@/components/ui/button-link";
import {
  getSession,
  clearSession,
  subscribeDemo,
  type DemoSession,
} from "@/lib/demo";

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [session, setSessionState] = useState<DemoSession | null>(null);
  const reduce = useReducedMotion();
  const langRef = useRef<HTMLDetailsElement>(null);
  const aboutRef = useRef<HTMLDetailsElement>(null);

  // §1.6 — авторизованное состояние шапки (демо-сессия)
  useEffect(() => {
    setSessionState(getSession());
    return subscribeDemo(() => setSessionState(getSession()));
  }, []);

  // закрытие выпадающих меню по клику вне и по Escape
  useEffect(() => {
    const refs = () => [langRef.current, aboutRef.current];
    const closeAll = () => {
      for (const d of refs()) if (d?.open) d.open = false;
    };
    const onDocClick = (e: MouseEvent) => {
      for (const d of refs()) {
        if (d?.open && !d.contains(e.target as Node)) d.open = false;
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAll();
    };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const topLinks = [...nav.categories, nav.specialists];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-cream/90 backdrop-blur-md">
      <div className="mx-auto flex h-18 max-w-[1400px] items-center justify-between gap-4 px-5 sm:px-8 xl:gap-6">
        <Link
          href="/"
          className="font-display text-xl font-semibold tracking-[0.08em] whitespace-nowrap text-ink"
        >
          NYANYA.UZ
        </Link>

        <nav aria-label="Основная навигация" className="hidden lg:block">
          <ul className="flex items-center gap-4 xl:gap-7">
            {topLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="label-caps whitespace-nowrap text-ink-soft transition-colors duration-300 hover:text-ink"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <details ref={aboutRef} className="group relative">
                <summary className="label-caps flex min-h-11 cursor-pointer list-none items-center gap-1.5 whitespace-nowrap text-ink-soft transition-colors duration-300 hover:text-ink [&::-webkit-details-marker]:hidden">
                  {nav.aboutMenu.label}
                  <CaretDown
                    size={12}
                    aria-hidden="true"
                    className="transition-transform duration-300 group-open:rotate-180"
                  />
                </summary>
                <ul className="absolute top-full left-0 mt-3 w-64 border border-line bg-paper py-2 shadow-[0_12px_32px_rgba(33,31,26,0.1)]">
                  {nav.aboutMenu.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => {
                          if (aboutRef.current) aboutRef.current.open = false;
                        }}
                        className="label-caps block px-4 py-2.5 text-ink-soft transition-colors duration-300 hover:bg-cream-deep hover:text-ink"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          </ul>
        </nav>

        <div className="flex items-center gap-3 sm:gap-5">
          <details ref={langRef} className="group relative hidden sm:block">
            <summary className="label-caps flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-ink-soft transition-colors duration-300 hover:text-ink [&::-webkit-details-marker]:hidden">
              <span className="sr-only">Язык сайта: </span>
              RU
              <CaretDown
                size={12}
                aria-hidden="true"
                className="transition-transform duration-300 group-open:rotate-180"
              />
            </summary>
            <div className="absolute top-full right-0 mt-3 w-44 border border-line bg-paper py-2 shadow-[0_12px_32px_rgba(33,31,26,0.1)]">
              {nav.languages.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  disabled={!lang.active}
                  aria-current={lang.active ? "true" : undefined}
                  className="label-caps block w-full px-4 py-2.5 text-left text-ink disabled:text-ink-faint"
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </details>

          {session ? (
            <div className="hidden items-center gap-5 md:flex">
              <ButtonLink
                href={session.role === "specialist" ? "/specialist" : "/account"}
              >
                Кабинет
              </ButtonLink>
              <button
                type="button"
                onClick={() => clearSession()}
                className="label-caps min-h-11 text-ink-soft transition-colors duration-300 hover:text-ink"
              >
                Выйти
              </button>
            </div>
          ) : (
            <div className="hidden md:block">
              <ButtonLink href={nav.login.href}>{nav.login.label}</ButtonLink>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
            className="flex size-11 items-center justify-center text-ink lg:hidden"
          >
            {menuOpen ? <X size={24} /> : <List size={24} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            aria-label="Мобильная навигация"
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reduce ? undefined : { opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: easeOutQuart }}
            className="max-h-[calc(100dvh-4.5rem)] overflow-y-auto border-t border-line bg-cream lg:hidden"
          >
            <ul className="flex flex-col px-5 py-4 sm:px-8">
              {topLinks.map((link) => (
                <li key={link.href} className="border-b border-line/70">
                  <Link
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="label-caps block py-4 text-ink-soft"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              {nav.aboutMenu.items.map((item) => (
                <li key={item.href} className="border-b border-line/70">
                  <Link
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="label-caps block py-4 text-ink-soft"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li className="border-b border-line/70 sm:hidden">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 py-4">
                  <span className="label-caps text-ink-soft">Язык:</span>
                  {nav.languages.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      disabled={!lang.active}
                      aria-current={lang.active ? "true" : undefined}
                      className="label-caps min-h-11 text-ink disabled:text-ink-faint"
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </li>
              {session ? (
                <li className="flex items-center gap-4 pt-4 pb-2">
                  <ButtonLink
                    href={
                      session.role === "specialist" ? "/specialist" : "/account"
                    }
                    onClick={() => setMenuOpen(false)}
                    className="flex-1"
                  >
                    Кабинет
                  </ButtonLink>
                  <button
                    type="button"
                    onClick={() => {
                      clearSession();
                      setMenuOpen(false);
                    }}
                    className="label-caps min-h-11 px-2 text-ink-soft"
                  >
                    Выйти
                  </button>
                </li>
              ) : (
                <li className="grid gap-3 pt-4 pb-2">
                  <ButtonLink
                    href={nav.login.href}
                    onClick={() => setMenuOpen(false)}
                    className="w-full"
                  >
                    {nav.login.label}
                  </ButtonLink>
                  <Link
                    href={nav.register.href}
                    onClick={() => setMenuOpen(false)}
                    className="label-caps inline-flex min-h-12 w-full items-center justify-center border border-line text-ink transition-colors duration-300 hover:border-ink-faint"
                  >
                    {nav.register.label}
                  </Link>
                </li>
              )}
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
