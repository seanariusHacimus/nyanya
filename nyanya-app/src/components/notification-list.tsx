"use client";

import { Bell } from "@phosphor-icons/react";
import type { UiNotification } from "@/lib/queries/notifications";

/**
 * Лента уведомлений. Одна и та же в обоих кабинетах: события пишут и
 * модерация, и открытие контактов, а читатель у них разный.
 */
export function NotificationList({
  notifications,
  emptyText = "Уведомлений пока нет.",
}: {
  notifications: UiNotification[];
  emptyText?: string;
}) {
  if (notifications.length === 0) {
    return <p className="mt-6 text-base text-ink-soft">{emptyText}</p>;
  }

  return (
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
            {new Date(n.createdAt).toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </li>
      ))}
    </ul>
  );
}

/** Заголовок раздела — чтобы кабинеты выглядели одинаково. */
export function NotificationHeading({ unread }: { unread?: number }) {
  return (
    <h2 className="flex items-center gap-3 font-display text-3xl font-medium text-ink">
      <Bell size={24} className="text-bronze" aria-hidden="true" />
      Уведомления
      {unread ? (
        <span className="label-caps rounded-full bg-bronze px-2.5 py-1 text-xs text-cream">
          {unread}
        </span>
      ) : null}
    </h2>
  );
}
