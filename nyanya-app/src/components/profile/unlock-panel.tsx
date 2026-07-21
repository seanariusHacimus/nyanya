"use client";

import { useEffect, useState } from "react";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  LockKeyOpen,
  Heart,
  Phone,
  TelegramLogo,
  WhatsappLogo,
  CheckCircle,
  CircleNotch,
  X,
} from "@phosphor-icons/react";
import {
  getSession,
  subscribeDemo,
  isUnlocked,
  unlock,
  getFavorites,
  toggleFavorite,
  demoContacts,
  type DemoSession,
} from "@/lib/demo";
import { easeOutQuart } from "@/lib/motion";
import { TrustScore } from "@/components/ui/trust-score";

type PanelSpecialist = {
  slug: string;
  name: string;
  age: number;
  categoryLabel: string;
  trustScore: number;
  priceLabel: string;
  fee: number;
  photo: StaticImageData;
  photoAlt: string;
};

type ModalState = "closed" | "confirm" | "processing" | "success";

const payMethods = ["Payme", "Click", "Uzum"] as const; // ⛳ mock — провайдеры подключаются позже

/** §5 P3 + §10 — панель контактов: гость → авторизован → оплата → открыто. */
export function UnlockPanel({ s }: { s: PanelSpecialist }) {
  const reduce = useReducedMotion();
  const [session, setSessionState] = useState<DemoSession | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [modal, setModal] = useState<ModalState>("closed");
  const [method, setMethod] = useState<(typeof payMethods)[number]>("Payme");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const sync = () => {
      setSessionState(getSession());
      setUnlocked(isUnlocked(s.slug));
      setFavorite(getFavorites().includes(s.slug));
    };
    sync();
    setHydrated(true);
    return subscribeDemo(sync);
  }, [s.slug]);

  useEffect(() => {
    if (modal === "closed") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && modal === "confirm") setModal("closed");
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modal]);

  const fee = s.fee.toLocaleString("ru-RU");
  const loginHref = `/login?next=${encodeURIComponent(`/specialists/${s.slug}`)}`;
  const contacts = demoContacts(s.slug);

  const startPayment = () => setModal("confirm");

  const pay = () => {
    setModal("processing");
    // U2 → U3: реальный провайдер заменит таймер редиректом и колбэком
    setTimeout(() => {
      unlock(s.slug, s.fee);
      setModal("success");
      setTimeout(() => setModal("closed"), 1600);
    }, 1400);
  };

  const favoriteButton = (
    <button
      type="button"
      onClick={() => {
        if (!session) {
          window.location.href = loginHref;
          return;
        }
        setFavorite(toggleFavorite(s.slug));
      }}
      className={`label-caps inline-flex min-h-12 w-full items-center justify-center gap-2 border px-6 transition-colors duration-300 ${
        favorite
          ? "border-bronze text-bronze-text"
          : "border-line text-ink hover:border-ink-faint"
      }`}
    >
      <Heart size={15} weight={favorite ? "fill" : "regular"} aria-hidden="true" />
      {favorite ? "В избранном" : "В избранное"}
    </button>
  );

  return (
    <>
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="border border-line bg-paper p-8" aria-live="polite">
          {!hydrated || !unlocked ? (
            <>
              <LockKeyOpen size={30} weight="thin" className="text-bronze" />
              <p className="mt-5 text-base leading-relaxed text-ink">
                Откройте контакты, чтобы связаться напрямую — телефон, Telegram и
                WhatsApp.
              </p>
              <p className="mt-6 font-display text-3xl font-medium text-ink">
                {fee} сум
              </p>
              <div className="mt-6 grid gap-3">
                {!hydrated || !session ? (
                  <Link
                    href={loginHref}
                    className="label-caps inline-flex min-h-12 items-center justify-center bg-ink px-6 text-center whitespace-nowrap text-cream transition-colors duration-300 hover:bg-charcoal active:translate-y-px"
                  >
                    Войдите, чтобы открыть контакты
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={startPayment}
                    className="label-caps inline-flex min-h-12 items-center justify-center bg-ink px-6 text-cream transition-colors duration-300 hover:bg-charcoal active:translate-y-px"
                  >
                    Открыть контакты — {fee} сум
                  </button>
                )}
                {favoriteButton}
              </div>
              <p className="mt-6 border-t border-line pt-5 text-xs leading-relaxed text-ink-soft">
                Оплата разовая — контакты останутся доступны в вашем кабинете.
              </p>
            </>
          ) : (
            <>
              <h2 className="font-display text-2xl font-medium text-ink">
                Контакты
              </h2>
              <ul className="mt-6 space-y-4">
                <li>
                  <a
                    href={contacts.phoneHref}
                    className="group flex items-center gap-4"
                  >
                    <span className="flex size-11 items-center justify-center rounded-full border border-bronze/40">
                      <Phone size={18} weight="thin" className="text-bronze" />
                    </span>
                    <span className="text-base font-medium text-ink transition-colors duration-300 group-hover:text-bronze-text">
                      {contacts.phone}
                    </span>
                  </a>
                </li>
                <li>
                  <a
                    href={contacts.telegramHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-4"
                  >
                    <span className="flex size-11 items-center justify-center rounded-full border border-bronze/40">
                      <TelegramLogo size={18} weight="thin" className="text-bronze" />
                    </span>
                    <span className="text-base font-medium text-ink transition-colors duration-300 group-hover:text-bronze-text">
                      {contacts.telegram}
                    </span>
                  </a>
                </li>
                <li>
                  <a
                    href={contacts.whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-4"
                  >
                    <span className="flex size-11 items-center justify-center rounded-full border border-bronze/40">
                      <WhatsappLogo size={18} weight="thin" className="text-bronze" />
                    </span>
                    <span className="text-base font-medium text-ink transition-colors duration-300 group-hover:text-bronze-text">
                      WhatsApp
                    </span>
                  </a>
                </li>
              </ul>
              <div className="mt-6">{favoriteButton}</div>
              <p className="mt-6 border-t border-line pt-5 text-xs leading-relaxed text-ink-soft">
                Контакты сохранены в вашем кабинете. Демо-данные.
              </p>
            </>
          )}
        </div>
      </aside>

      {/* P8 — липкая мобильная панель, состояние синхронно с P3 */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 border-t border-line bg-cream/95 px-5 py-3 backdrop-blur-md lg:hidden">
        <p className="text-sm font-semibold text-ink">{s.priceLabel}</p>
        {!hydrated || !session ? (
          <Link
            href={loginHref}
            className="label-caps inline-flex min-h-11 shrink-0 items-center bg-ink px-5 text-cream active:translate-y-px"
          >
            Открыть контакты
          </Link>
        ) : unlocked ? (
          <a
            href={contacts.phoneHref}
            className="label-caps inline-flex min-h-11 shrink-0 items-center bg-ink px-5 text-cream active:translate-y-px"
          >
            Позвонить
          </a>
        ) : (
          <button
            type="button"
            onClick={startPayment}
            className="label-caps inline-flex min-h-11 shrink-0 items-center bg-ink px-5 text-cream active:translate-y-px"
          >
            Открыть контакты
          </button>
        )}
      </div>

      {/* §10 — модал оплаты */}
      <AnimatePresence>
        {modal !== "closed" && (
          <motion.div
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal-deep/60 p-0 sm:items-center sm:p-6"
            onClick={(e) => {
              if (e.target === e.currentTarget && modal === "confirm")
                setModal("closed");
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Оплата открытия контактов"
              initial={reduce ? false : { opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: 32 }}
              transition={{ duration: 0.35, ease: easeOutQuart }}
              className="w-full max-w-md bg-cream p-8 sm:rounded-[2px]"
            >
              {modal === "confirm" && (
                <>
                  {/* U1 — подтверждение */}
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="font-display text-2xl font-medium text-ink">
                      Открыть контакты
                    </h2>
                    <button
                      type="button"
                      onClick={() => setModal("closed")}
                      aria-label="Закрыть"
                      className="flex size-10 items-center justify-center text-ink-soft hover:text-ink"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="mt-6 flex items-center gap-4 border border-line bg-paper p-4">
                    <Image
                      src={s.photo}
                      alt={s.photoAlt}
                      width={56}
                      height={70}
                      className="h-[70px] w-14 rounded-[2px] object-cover object-top"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold text-ink">
                        {s.name}, {s.age}
                      </p>
                      <p className="mt-0.5 text-sm text-ink-soft">
                        {s.categoryLabel}
                      </p>
                    </div>
                    <TrustScore score={s.trustScore} size="sm" />
                  </div>

                  <ul className="mt-5 flex items-center gap-5 text-sm text-ink-soft">
                    <li className="flex items-center gap-2">
                      <Phone size={16} className="text-bronze" /> Телефон
                    </li>
                    <li className="flex items-center gap-2">
                      <TelegramLogo size={16} className="text-bronze" /> Telegram
                    </li>
                    <li className="flex items-center gap-2">
                      <WhatsappLogo size={16} className="text-bronze" /> WhatsApp
                    </li>
                  </ul>

                  <fieldset className="mt-6">
                    <legend className="text-sm font-semibold text-ink">
                      Способ оплаты
                    </legend>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {payMethods.map((m) => (
                        <label
                          key={m}
                          className={`flex min-h-11 cursor-pointer items-center justify-center border text-sm font-medium transition-colors duration-300 ${
                            method === m
                              ? "border-ink bg-cream-deep text-ink"
                              : "border-line text-ink-soft hover:border-ink-faint"
                          }`}
                        >
                          <input
                            type="radio"
                            name="pay-method"
                            value={m}
                            checked={method === m}
                            onChange={() => setMethod(m)}
                            className="sr-only"
                          />
                          {m}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <button
                    type="button"
                    onClick={pay}
                    className="label-caps mt-6 inline-flex min-h-12 w-full items-center justify-center bg-ink px-6 text-cream transition-colors duration-300 hover:bg-charcoal active:translate-y-px"
                  >
                    Оплатить {fee} сум
                  </button>
                  <p className="mt-4 text-center text-xs leading-relaxed text-ink-soft">
                    Оплата разовая — контакты останутся доступны в вашем кабинете.
                    Нажимая «Оплатить», вы принимаете{" "}
                    <Link href="/terms" className="underline">
                      условия
                    </Link>
                    . Демо-режим: списания не происходит.
                  </p>
                </>
              )}

              {modal === "processing" && (
                /* U2 — обработка */
                <div className="flex min-h-56 flex-col items-center justify-center text-center">
                  <CircleNotch
                    size={36}
                    className="animate-spin text-bronze"
                    aria-hidden="true"
                  />
                  <p className="mt-5 text-base text-ink" role="status">
                    Обработка оплаты…
                  </p>
                </div>
              )}

              {modal === "success" && (
                /* U3 — успех */
                <div className="flex min-h-56 flex-col items-center justify-center text-center">
                  <CheckCircle
                    size={40}
                    weight="thin"
                    className="text-bronze"
                    aria-hidden="true"
                  />
                  <p
                    className="mt-5 font-display text-2xl font-medium text-ink"
                    role="status"
                  >
                    Контакты открыты
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
