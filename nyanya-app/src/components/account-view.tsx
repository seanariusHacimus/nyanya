"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  SealCheck,
  Heart,
  Phone,
  TelegramLogo,
  WhatsappLogo,
  Bell,
  Receipt,
  SignOut,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import {
  getSession,
  clearSession,
  subscribeDemo,
  getFavorites,
  getPayments,
  demoContacts,
  type DemoSession,
  type DemoPayment,
} from "@/lib/demo";
import { specialists, categories, UNLOCK_FEE_UZS } from "@/content/specialists";
import { SpecialistCard } from "@/components/specialist-card";
import { ButtonLink } from "@/components/ui/button-link";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** §11 — кабинет родителя (демо-данные из localStorage). */
export function AccountView() {
  const [session, setSession] = useState<DemoSession | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [payments, setPayments] = useState<DemoPayment[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const sync = () => {
      setSession(getSession());
      setFavorites(getFavorites());
      setPayments(getPayments());
    };
    sync();
    setHydrated(true);
    return subscribeDemo(sync);
  }, []);

  if (!hydrated) return <div className="min-h-[50vh]" />;

  if (!session) {
    return (
      <div className="mx-auto max-w-[1400px] px-5 py-28 text-center sm:px-8">
        <h1 className="font-display text-4xl font-medium text-ink">Кабинет</h1>
        <p className="mx-auto mt-5 max-w-md text-lg text-ink-soft">
          Войдите, чтобы видеть избранное и открытые контакты.
        </p>
        <div className="mt-10 flex justify-center">
          <ButtonLink href="/login?next=/account">Войти</ButtonLink>
        </div>
      </div>
    );
  }

  const favoriteSpecialists = specialists.filter((s) =>
    favorites.includes(s.slug)
  );
  const unlockedRows = payments
    .slice()
    .reverse()
    .map((p) => ({
      payment: p,
      specialist: specialists.find((s) => s.slug === p.slug),
    }))
    .filter((r) => r.specialist);

  const notifications = [
    ...unlockedRows.map((r) => ({
      title: "Контакты открыты",
      body: `${r.specialist!.name} — телефон, Telegram и WhatsApp доступны в кабинете.`,
      date: r.payment.date,
    })),
    {
      title: "Добро пожаловать на nyanya.uz",
      body: "Сохраняйте специалистов в избранное и открывайте контакты — они останутся здесь навсегда.",
      date: new Date().toISOString(),
    },
  ];

  return (
    <div className="mx-auto max-w-[1400px] px-5 pt-14 pb-24 sm:px-8 lg:pt-20">
      {/* K1 — шапка кабинета */}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="label-caps text-bronze-text">Кабинет · Родитель</p>
          <h1 className="mt-3 font-display text-4xl leading-[1.08] font-medium text-ink sm:text-5xl">
            {session.name}
          </h1>
          <p className="mt-4 flex items-center gap-2 text-sm text-ink-soft">
            <SealCheck size={16} className="text-bronze" aria-hidden="true" />
            Телефон подтверждён
          </p>
        </div>
        <button
          type="button"
          onClick={() => clearSession()}
          className="label-caps flex min-h-11 items-center gap-2 text-ink-soft transition-colors duration-300 hover:text-ink"
        >
          <SignOut size={16} aria-hidden="true" />
          Выйти
        </button>
      </div>

      {/* K2 — навигация по разделам */}
      <nav aria-label="Разделы кабинета" className="mt-10 border-y border-line">
        <ul className="flex flex-wrap gap-x-8 gap-y-2 py-4">
          {[
            ["#favorites", "Избранное"],
            ["#contacts", "Открытые контакты"],
            ["#payments", "История платежей"],
            ["#notifications", "Уведомления"],
          ].map(([href, label]) => (
            <li key={href}>
              <a
                href={href}
                className="label-caps text-ink-soft transition-colors duration-300 hover:text-ink"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* K3 — избранное */}
      <section id="favorites" className="mt-14 scroll-mt-24">
        <h2 className="flex items-center gap-3 font-display text-3xl font-medium text-ink">
          <Heart size={24} className="text-bronze" aria-hidden="true" />
          Избранное
        </h2>
        {favoriteSpecialists.length > 0 ? (
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {favoriteSpecialists.map((s) => (
              <li key={s.slug}>
                <SpecialistCard specialist={s} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-8 flex flex-col items-center border border-line bg-paper px-8 py-16 text-center">
            <p className="max-w-sm text-base text-ink-soft">
              В избранном пока пусто.
            </p>
            <div className="mt-7">
              <ButtonLink href="/catalog">Перейти в каталог</ButtonLink>
            </div>
          </div>
        )}
      </section>

      {/* K4 — открытые контакты */}
      <section id="contacts" className="mt-16 scroll-mt-24">
        <h2 className="flex items-center gap-3 font-display text-3xl font-medium text-ink">
          <Phone size={24} className="text-bronze" aria-hidden="true" />
          Открытые контакты
        </h2>
        {unlockedRows.length > 0 ? (
          <ul className="mt-8 divide-y divide-line border-y border-line">
            {unlockedRows.map(({ payment, specialist }) => {
              const s = specialist!;
              const c = demoContacts(s.slug);
              return (
                <li
                  key={payment.slug}
                  className="flex flex-wrap items-center gap-5 py-5"
                >
                  <Link
                    href={`/specialists/${s.slug}`}
                    className="flex min-w-0 flex-1 items-center gap-4"
                  >
                    <Image
                      src={s.photo}
                      alt={s.photoAlt}
                      width={48}
                      height={60}
                      className="h-[60px] w-12 rounded-[2px] object-cover object-top"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-base font-semibold text-ink">
                        {s.name}
                      </span>
                      <span className="mt-0.5 block text-sm text-ink-soft">
                        {categories[s.category].label} · открыто{" "}
                        {formatDateTime(payment.date)}
                      </span>
                    </span>
                  </Link>
                  <span className="flex items-center gap-2">
                    <a
                      href={c.phoneHref}
                      aria-label={`Позвонить: ${s.name}`}
                      className="flex size-11 items-center justify-center rounded-full border border-bronze/40 text-bronze transition-colors duration-300 hover:bg-cream-deep"
                    >
                      <Phone size={17} />
                    </a>
                    <a
                      href={c.telegramHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Telegram: ${s.name}`}
                      className="flex size-11 items-center justify-center rounded-full border border-bronze/40 text-bronze transition-colors duration-300 hover:bg-cream-deep"
                    >
                      <TelegramLogo size={17} />
                    </a>
                    <a
                      href={c.whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`WhatsApp: ${s.name}`}
                      className="flex size-11 items-center justify-center rounded-full border border-bronze/40 text-bronze transition-colors duration-300 hover:bg-cream-deep"
                    >
                      <WhatsappLogo size={17} />
                    </a>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-8 flex flex-col items-center border border-line bg-paper px-8 py-16 text-center">
            <p className="max-w-sm text-base text-ink-soft">
              Вы ещё не открывали контакты.
            </p>
            <div className="mt-7">
              <ButtonLink href="/catalog">Перейти в каталог</ButtonLink>
            </div>
          </div>
        )}
      </section>

      {/* K5 — история платежей */}
      <section id="payments" className="mt-16 scroll-mt-24">
        <h2 className="flex items-center gap-3 font-display text-3xl font-medium text-ink">
          <Receipt size={24} className="text-bronze" aria-hidden="true" />
          История платежей
        </h2>
        {unlockedRows.length > 0 ? (
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="label-caps py-3 pr-6 font-medium text-ink-faint">
                    Дата
                  </th>
                  <th className="label-caps py-3 pr-6 font-medium text-ink-faint">
                    Специалист
                  </th>
                  <th className="label-caps py-3 pr-6 font-medium text-ink-faint">
                    Сумма
                  </th>
                  <th className="label-caps py-3 font-medium text-ink-faint">
                    Статус
                  </th>
                </tr>
              </thead>
              <tbody>
                {unlockedRows.map(({ payment, specialist }) => (
                  <tr key={payment.slug} className="border-b border-line/60">
                    <td className="py-4 pr-6 text-ink-soft">
                      {formatDateTime(payment.date)}
                    </td>
                    <td className="py-4 pr-6 font-medium text-ink">
                      {specialist!.name}
                    </td>
                    <td className="py-4 pr-6 text-ink">
                      {UNLOCK_FEE_UZS.toLocaleString("ru-RU")} сум
                    </td>
                    <td className="py-4">
                      <span className="label-caps text-bronze-text">Оплачен</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-6 text-base text-ink-soft">Платежей пока нет.</p>
        )}
      </section>

      {/* K6 — уведомления */}
      <section id="notifications" className="mt-16 scroll-mt-24">
        <h2 className="flex items-center gap-3 font-display text-3xl font-medium text-ink">
          <Bell size={24} className="text-bronze" aria-hidden="true" />
          Уведомления
        </h2>
        <ul className="mt-8 space-y-4">
          {notifications.map((n, i) => (
            <li key={i} className="border border-line bg-paper p-6">
              <p className="text-base font-semibold text-ink">{n.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                {n.body}
              </p>
              <p className="mt-3 text-xs text-ink-faint">
                {formatDateTime(n.date)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* пустой каталог-призыв, если совсем нет активности */}
      {favoriteSpecialists.length === 0 && unlockedRows.length === 0 && (
        <div className="mt-16 flex flex-col items-center gap-5 border-t border-line pt-12 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="flex items-center gap-3 font-display text-2xl font-medium text-ink">
            <MagnifyingGlass size={22} className="text-bronze" aria-hidden="true" />
            Начните с каталога проверенных специалистов
          </p>
          <ButtonLink href="/catalog">Подобрать специалиста</ButtonLink>
        </div>
      )}
    </div>
  );
}
