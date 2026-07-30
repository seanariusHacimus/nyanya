import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAdminData } from "@/lib/queries/admin";
import { AdminView } from "@/components/admin-view";

export const metadata = {
  title: "Админ-панель",
  description: "Модерация специалистов и управление платформой.",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  // §13 — панель доступна только роли admin; проверка на сервере, до запросов
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login?next=/admin");
  if (session.user.role !== "admin") redirect("/");

  const data = await getAdminData();

  return (
    <main className="flex-1">
      <AdminView data={data} currentUserId={session.user.id} />
    </main>
  );
}
