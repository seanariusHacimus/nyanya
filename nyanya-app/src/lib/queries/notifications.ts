import { and, count, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";

/**
 * Уведомления — общие для обоих кабинетов.
 *
 * Раньше жили только в кабинете заказчика, из-за чего модерация писала
 * специалисту уведомления, которые он нигде не видел.
 */

export type UiNotification = {
  id: string;
  title: string;
  body: string | null;
  createdAt: string;
  read: boolean;
};

/** Сколько последних уведомлений показываем в кабинете. */
const FEED_LIMIT = 20;

export async function getNotifications(
  userId: string,
  limit: number = FEED_LIMIT
): Promise<UiNotification[]> {
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);

  return rows.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    createdAt: n.createdAt.toISOString(),
    read: n.readAt !== null,
  }));
}

/** Счётчик для значка в шапке. */
export async function getUnreadCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return row?.n ?? 0;
}

/**
 * Помечает всё прочитанным. Вызывается при открытии кабинета: пользователь
 * увидел ленту — значок гаснет.
 */
export async function markNotificationsRead(userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}
