"use client";

import Image from "next/image";
import Link from "next/link";
import {
  SealCheck,
  Heart,
  Phone,
  TelegramLogo,
  WhatsappLogo,
  Bell,
  SignOut,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import { authClient } from "@/lib/auth-client";
import { clearSession } from "@/lib/demo";
import type { AccountData } from "@/lib/queries/account";
import { SpecialistCard } from "@/components/specialist-card";
import { ButtonLink } from "@/components/ui/button-link";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** §11 — кабинет заказчика на данных из PostgreSQL. */
export function AccountView({
  name,
  phoneVerified,
  data,
}: {
  name: string;
  phoneVerified: boolean;
  data: AccountData;
}) {
  const { favorites, unlocked, notifications } = data;
  const favoriteSlugs = new Set(favorites.map((f) => f.slug));

  return (
    <div className="mx-auto max-w-[1400px] px-5 pt-14 pb-24 sm:px-8 lg:pt-20">
      {/* K1 — шапка кабинета */}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="label-caps text-bronze-text">Кабинет · Родитель</p>
          <h1 className="mt-3 font-display text-4xl leading-[1.08] font-medium text-ink sm:text-5xl">
            {name}
          </h1>
          <p className="mt-4 flex items-center gap-2 text-sm text-ink-soft">
            <SealCheck size={16} className="text-bronze" aria-hidden="true" />
            {phoneVerified ? "Телефон подтверждён" : "Почта подтверждена"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void authClient.signOut();
            clearSession();
            window.location.href = "/";
          }}
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
            ["#favorites", `Избранное (${favorites.length})`],
            ["#contacts", `Открытые контакты (${unlocked.length})`],
            ["#notifications", `Уведомления (${notifications.length})`],
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
        {favorites.length > 0 ? (
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {favorites.map((s) => (
              <li key={s.slug}>
                <SpecialistCard
                  specialist={s}
                  favorite={favoriteSlugs.has(s.slug)}
                  authed
                />
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
        {unlocked.length > 0 ? (
          <ul className="mt-8 divide-y divide-line border-y border-line">
            {unlocked.map(({ specialist, categoryLabel, unlockedAt, contacts }) => (
              <li
                key={specialist.slug}
                className="flex flex-wrap items-center gap-5 py-5"
              >
                <Link
                  href={`/specialists/${specialist.slug}`}
                  className="flex min-w-0 flex-1 items-center gap-4"
                >
                  {specialist.photoUrl ? (
                    <Image
                      src={specialist.photoUrl}
                      alt={`${specialist.name} — портрет`}
                      width={48}
                      height={60}
                      className="h-[60px] w-12 rounded-[2px] object-cover object-top"
                    />
                  ) : (
                    <span className="flex h-[60px] w-12 items-center justify-center rounded-[2px] bg-cream-deep font-display text-base text-bronze-text">
                      {specialist.name
                        .split(" ")
                        .slice(0, 2)
                        .map((w) => w[0])
                        .join("")}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-base font-semibold text-ink">
                      {specialist.name}
                    </span>
                    <span className="mt-0.5 block text-sm text-ink-soft">
                      {categoryLabel} · открыто {formatDate(unlockedAt)}
                    </span>
                  </span>
                </Link>
                <span className="flex items-center gap-2">
                  <a
                    href={contacts.phoneHref}
                    aria-label={`Позвонить: ${specialist.name}`}
                    className="flex size-11 items-center justify-center rounded-full border border-bronze/40 text-bronze transition-colors duration-300 hover:bg-cream-deep"
                  >
                    <Phone size={17} />
                  </a>
                  <a
                    href={contacts.telegramHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Telegram: ${specialist.name}`}
                    className="flex size-11 items-center justify-center rounded-full border border-bronze/40 text-bronze transition-colors duration-300 hover:bg-cream-deep"
                  >
                    <TelegramLogo size={17} />
                  </a>
                  <a
                    href={contacts.whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`WhatsApp: ${specialist.name}`}
                    className="flex size-11 items-center justify-center rounded-full border border-bronze/40 text-bronze transition-colors duration-300 hover:bg-cream-deep"
                  >
                    <WhatsappLogo size={17} />
                  </a>
                </span>
              </li>
            ))}
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

      {/* K6 — уведомления */}
      <section id="notifications" className="mt-16 scroll-mt-24">
        <h2 className="flex items-center gap-3 font-display text-3xl font-medium text-ink">
          <Bell size={24} className="text-bronze" aria-hidden="true" />
          Уведомления
        </h2>
        {notifications.length > 0 ? (
          <ul className="mt-8 space-y-4">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`border p-6 ${
                  n.read ? "border-line bg-paper" : "border-bronze/40 bg-cream-deep"
                }`}
              >
                <p className="text-base font-semibold text-ink">{n.title}</p>
                {n.body && (
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                    {n.body}
                  </p>
                )}
                <p className="mt-3 text-xs text-ink-faint">
                  {formatDate(n.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 text-base text-ink-soft">Уведомлений пока нет.</p>
        )}
      </section>

      {favorites.length === 0 && unlocked.length === 0 && (
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
