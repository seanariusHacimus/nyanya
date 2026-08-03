import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getUnreadCount } from "@/lib/queries/notifications";

/**
 * Счётчик непрочитанных для значка в шапке.
 *
 * Отдельный маршрут, а не подсчёт в layout: layout рендерится на каждой
 * странице, и обращение к сессии там сделало бы динамическими даже
 * статические страницы вроде «О сервисе».
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ count: 0 });

  const count = await getUnreadCount(session.user.id);
  return Response.json(
    { count },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
