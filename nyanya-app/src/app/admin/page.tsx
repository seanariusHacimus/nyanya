import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUncached } from "@/lib/auth";
import { getAdminData } from "@/lib/queries/admin";
import { AdminView } from "@/components/admin-view";

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

  const data = await getAdminData();

  return <AdminView data={data} currentUserId={session.user.id} section="overview" />;
}
