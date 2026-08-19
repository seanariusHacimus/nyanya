"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartPie,
  IdentificationCard,
  FileText,
  Users,
  Plus,
} from "@phosphor-icons/react";

/**
 * Навигация админки.
 *
 * На широком экране — колонка слева, на телефоне — горизонтальная лента
 * вкладок. Гамбургер здесь не годится: он уже занят публичной навигацией
 * сайта, и два разных гамбургера на одной странице путают.
 *
 * Счётчики рядом с разделами показывают, где ждут решения. Это главное, что
 * модератор хочет узнать, не открывая ничего: сколько анкет и документов
 * висит.
 */

export type AdminNavCounts = {
  pendingProfiles: number;
  pendingDocuments: number;
  profiles: number;
  users: number;
};

export function AdminSidebar({ counts }: { counts: AdminNavCounts }) {
  const pathname = usePathname();

  const items = [
    { href: "/admin", label: "Обзор", icon: ChartPie, badge: 0 },
    {
      href: "/admin/profiles",
      label: "Анкеты",
      icon: IdentificationCard,
      badge: counts.pendingProfiles,
    },
    {
      href: "/admin/documents",
      label: "Документы",
      icon: FileText,
      badge: counts.pendingDocuments,
    },
    { href: "/admin/users", label: "Пользователи", icon: Users, badge: 0 },
  ];

  return (
    <nav
      aria-label="Разделы админки"
      /**
       * `min-w-0` обязателен: nav — элемент грида, а у них по умолчанию
       * min-width: auto, поэтому колонка растягивалась под самую длинную
       * вкладку и `overflow-x-auto` ниже не срабатывал — страница уезжала
       * вбок на 176 px.
       */
      className="min-w-0 lg:sticky lg:top-24 lg:self-start"
    >
      <ul className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
        {items.map((item) => {
          // «Обзор» подсвечиваем только на точном совпадении, иначе он
          // оставался бы активным на всех вложенных страницах
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 whitespace-nowrap border-l-2 px-4 text-sm transition-colors duration-300 lg:px-5 ${
                  active
                    ? "border-bronze bg-cream-deep font-semibold text-ink"
                    : "border-transparent text-ink-soft hover:bg-cream-deep hover:text-ink"
                }`}
              >
                <item.icon
                  size={17}
                  weight={active ? "fill" : "regular"}
                  className={active ? "text-bronze" : "text-ink-faint"}
                  aria-hidden="true"
                />
                {item.label}
                {item.badge > 0 && (
                  <span
                    aria-label={`Ждут решения: ${item.badge}`}
                    className="ml-auto inline-flex min-w-6 items-center justify-center rounded-full bg-bronze px-2 py-0.5 text-[11px] leading-none text-cream"
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      <Link
        href="/admin/new"
        className="label-caps mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 bg-ink px-6 text-cream transition-colors duration-300 hover:bg-charcoal active:translate-y-px"
      >
        <Plus size={15} aria-hidden="true" />
        Добавить анкету
      </Link>
    </nav>
  );
}
