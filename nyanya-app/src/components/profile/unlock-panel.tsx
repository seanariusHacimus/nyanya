"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  LockKeyOpen,
  Heart,
  Phone,
  TelegramLogo,
  WhatsappLogo,
  UserPlus,
  X,
} from "@phosphor-icons/react";
import { unlockContacts } from "@/lib/actions/unlock-contacts";
import { toggleFavoriteAction } from "@/lib/actions/favorites";
import type { SpecialistContacts } from "@/lib/specialists-shared";
import { easeOutQuart } from "@/lib/motion";
import { TrustScore } from "@/components/ui/trust-score";

type PanelSpecialist = {
  slug: string;
  name: string;
  age: number | null;
  categoryLabel: string;
  trustScore: number;
  priceLabel: string;
  photoUrl: string | null;
};

type PanelProps = {
  s: PanelSpecialist;
  initialAuthed: boolean;
  initialContacts: SpecialistContacts | null;
  initialFavorite?: boolean;
  /** Стоимость открытия контактов, отформатированная на сервере.
   *  Не путать с s.priceLabel — там ставка специалиста за час/день. */
  unlockPriceLabel: string;
};

/**
 * §5 P3 — панель контактов. Открытие платное (решение владельца, 2026-08-03):
 * гостю — модальное окно с предложением зарегистрироваться, вошедшему —
 * оплата, после подтверждения которой server action открывает контакты.
 * Повторное открытие уже оплаченного специалиста бесплатно.
 */
export function UnlockPanel({
  s,
  initialAuthed,
  initialContacts,
  initialFavorite = false,
  unlockPriceLabel,
}: PanelProps) {
  const reduce = useReducedMotion();
  const [contacts, setContacts] = useState<SpecialistContacts | null>(
    initialContacts
  );
  const [guestModal, setGuestModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [favorite, setFavorite] = useState(initialFavorite);

  useEffect(() => {
    if (!guestModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setGuestModal(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [guestModal]);

  const profileHref = `/specialists/${s.slug}`;
  const unlocked = contacts !== null;

  const open = () => {
    if (!initialAuthed) {
      setGuestModal(true);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await unlockContacts({ slug: s.slug });
      if (result.ok) {
        if ("redirectUrl" in result && result.redirectUrl) {
          // провайдер требует оплату на своей стороне
          window.location.href = result.redirectUrl;
          return;
        }
        if ("contacts" in result && result.contacts) setContacts(result.contacts);
      } else if (result.error === "unauthorized") {
        setGuestModal(true);
      } else if (result.error === "payment_failed") {
        setError("Оплата не прошла. Попробуйте ещё раз или выберите другой способ.");
      } else if (result.error === "no_contacts") {
        setError("У специалиста не указан телефон — контакты недоступны.");
      } else {
        setError("Не удалось открыть контакты. Попробуйте ещё раз.");
      }
    });
  };

  const favoriteButton = (
    <button
      type="button"
      onClick={() => {
        if (!initialAuthed) {
          window.location.href = `/login?next=${encodeURIComponent(profileHref)}`;
          return;
        }
        const next = !favorite;
        setFavorite(next); // оптимистично
        startTransition(async () => {
          const result = await toggleFavoriteAction({ slug: s.slug });
          if (!result.ok) setFavorite(!next);
          else setFavorite(result.active);
        });
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
          {!unlocked ? (
            <>
              <LockKeyOpen size={30} weight="thin" className="text-bronze" />
              <p className="mt-5 text-base leading-relaxed text-ink">
                Откройте контакты, чтобы связаться напрямую — телефон, Telegram и
                WhatsApp.
              </p>
              <p className="mt-4 font-display text-3xl font-medium text-ink">
                {unlockPriceLabel}
              </p>
              <p className="mt-2 text-sm text-ink-soft">
                Разовая оплата за этот контакт. Повторный доступ — бесплатно.
              </p>
              <div className="mt-6 grid gap-3">
                <button
                  type="button"
                  onClick={open}
                  disabled={pending}
                  className="label-caps inline-flex min-h-12 items-center justify-center bg-ink px-6 text-cream transition-colors duration-300 hover:bg-charcoal active:translate-y-px disabled:opacity-70"
                >
                  {pending ? "Открываем…" : "Оплатить и открыть контакты"}
                </button>
                {favoriteButton}
              </div>
              {error && (
                <p role="alert" className="mt-4 text-sm text-[#a5462f]">
                  {error}
                </p>
              )}
              <p className="mt-6 border-t border-line pt-5 text-xs leading-relaxed text-ink-soft">
                После оплаты контакты останутся доступны в вашем кабинете —
                платить второй раз за того же специалиста не нужно.
              </p>
            </>
          ) : (
            <>
              <h2 className="font-display text-2xl font-medium text-ink">
                Контакты
              </h2>
              <ul className="mt-6 space-y-4">
                <li>
                  <a href={contacts.phoneHref} className="group flex items-center gap-4">
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
                Контакты сохранены в вашем кабинете.
              </p>
            </>
          )}
        </div>
      </aside>

      {/* P8 — липкая мобильная панель */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 border-t border-line bg-cream/95 px-5 py-3 backdrop-blur-md lg:hidden">
        <p className="text-sm font-semibold text-ink">{s.priceLabel}</p>
        {unlocked ? (
          <a
            href={contacts.phoneHref}
            className="label-caps inline-flex min-h-11 shrink-0 items-center bg-ink px-5 text-cream active:translate-y-px"
          >
            Позвонить
          </a>
        ) : (
          <button
            type="button"
            onClick={open}
            disabled={pending}
            className="label-caps inline-flex min-h-11 shrink-0 items-center bg-ink px-5 text-cream active:translate-y-px disabled:opacity-70"
          >
            Оплатить и открыть
          </button>
        )}
      </div>

      {/* модальное окно для гостя (решение владельца, 2026-07-27) */}
      <AnimatePresence>
        {guestModal && (
          <motion.div
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal-deep/60 p-0 sm:items-center sm:p-6"
            onClick={(e) => {
              if (e.target === e.currentTarget) setGuestModal(false);
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Регистрация для доступа к контактам"
              initial={reduce ? false : { opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: 32 }}
              transition={{ duration: 0.35, ease: easeOutQuart }}
              className="w-full max-w-md bg-cream p-8 sm:rounded-[2px]"
            >
              <div className="flex items-start justify-between gap-4">
                <UserPlus size={30} weight="thin" className="text-bronze" />
                <button
                  type="button"
                  onClick={() => setGuestModal(false)}
                  aria-label="Закрыть"
                  className="flex size-10 items-center justify-center text-ink-soft hover:text-ink"
                >
                  <X size={20} />
                </button>
              </div>

              <h2 className="mt-4 font-display text-2xl leading-snug font-medium text-ink">
                Для доступа к контактам нужно зарегистрироваться
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                Регистрация бесплатна и занимает минуту. Доступ к контактам
                специалиста оплачивается отдельно — {unlockPriceLabel} за контакт.
              </p>

              <div className="mt-6 flex items-center gap-4 border border-line bg-paper p-4">
                {s.photoUrl ? (
                  <Image
                    src={s.photoUrl}
                    alt={`${s.name} — портрет`}
                    width={56}
                    height={70}
                    className="h-[70px] w-14 rounded-[2px] object-cover object-top"
                  />
                ) : (
                  <span className="flex h-[70px] w-14 items-center justify-center rounded-[2px] bg-cream-deep font-display text-lg text-bronze-text">
                    {s.name
                      .split(" ")
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join("")}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-ink">
                    {s.name}
                    {s.age !== null && `, ${s.age}`}
                  </p>
                  <p className="mt-0.5 text-sm text-ink-soft">{s.categoryLabel}</p>
                </div>
                <TrustScore score={s.trustScore} size="sm" />
              </div>

              <div className="mt-6 grid gap-3">
                <Link
                  href={`/register?next=${encodeURIComponent(profileHref)}`}
                  className="label-caps inline-flex min-h-12 items-center justify-center bg-ink px-6 text-cream transition-colors duration-300 hover:bg-charcoal active:translate-y-px"
                >
                  Зарегистрироваться
                </Link>
                <Link
                  href={`/login?next=${encodeURIComponent(profileHref)}`}
                  className="label-caps inline-flex min-h-12 items-center justify-center border border-line px-6 text-ink transition-colors duration-300 hover:border-ink-faint"
                >
                  Войти
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
