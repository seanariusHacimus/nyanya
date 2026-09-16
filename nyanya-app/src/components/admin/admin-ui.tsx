import { Warning } from "@phosphor-icons/react";
import type { ProfileStatus } from "@/lib/queries/admin";

/** Подписи и кнопки, общие для всех разделов админки. */

export const STATUS_LABEL: Record<ProfileStatus, { text: string; cls: string }> =
  {
    draft: { text: "Черновик", cls: "text-ink-faint" },
    pending_review: { text: "На проверке", cls: "text-ink" },
    active: { text: "Опубликована", cls: "text-bronze-text" },
    hidden: { text: "Скрыта", cls: "text-ink-faint" },
    rejected: { text: "Отклонена", cls: "text-[#a5462f]" },
  };

export const ROLE_LABEL: Record<string, string> = {
  parent: "Родитель",
  specialist: "Специалист",
  admin: "Администратор",
};

/**
 * Дата и время — по Ташкенту, пояс задан явно. Компонент рендерится и на
 * сервере (на Railway это UTC), и в браузере администратора: без пояса
 * запись, сделанная между 00:00 и 05:00 по Ташкенту, получала на сервере
 * вчерашнюю дату, и React падал с ошибкой гидратации #418 (проверено
 * локально 2026-09-16: сервер с TZ=UTC, браузер в Asia/Tashkent).
 */
export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Tashkent",
  });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tashkent",
  });
}

export const actionButton =
  "label-caps min-h-9 border border-line px-3 text-ink-soft transition-colors duration-300 hover:border-ink-faint hover:text-ink disabled:opacity-40";
export const dangerButton =
  "label-caps min-h-9 border border-line px-3 text-[#a5462f] transition-colors duration-300 hover:border-[#a5462f] disabled:opacity-40";

/** Ошибка последнего действия — одинаковая шапка во всех разделах. */
export function AdminError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p
      role="alert"
      className="mt-6 flex items-start gap-2 border border-[#a5462f]/40 bg-[#a5462f]/5 px-4 py-3 text-sm text-[#a5462f]"
    >
      <Warning size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      {error}
    </p>
  );
}
