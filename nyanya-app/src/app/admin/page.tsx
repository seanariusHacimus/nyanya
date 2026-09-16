import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUncached } from "@/lib/auth";
import {
  getAdminStats,
  getFlaggedUsers,
  getModerationQueue,
  PAGE_SIZE,
} from "@/lib/queries/admin";
import { AdminOverview } from "@/components/admin/admin-overview";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Админ-панель",
  description: "Модерация специалистов и управление платформой.",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  // §13 — панель доступна только роли admin; проверка на сервере, до запросов
  // роль читается из базы, мимо кэша сессии в куке: снятая роль и
  // блокировка должны закрывать админку сразу
  const session = await getSessionUncached(await headers());
  if (!session) redirect("/login?next=/admin");
  if (session.user.role !== "admin") redirect("/");

  // не больше 50 анкет «Не в каталоге»: остальные — по ссылке на постраничный
  // список, обзор не должен расти вместе с числом брошенных черновиков
  const [stats, flagged, queue] = await Promise.all([
    getAdminStats(),
    getFlaggedUsers(),
    getModerationQueue(PAGE_SIZE),
  ]);

  return (
    <AdminOverview
      stats={stats}
      flagged={flagged.rows}
      unlockDailyCap={flagged.dailyCap}
      queue={queue}
      currentUserId={session.user.id}
    />
  );
}
