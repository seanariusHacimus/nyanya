import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getSessionUncached } from "@/lib/auth";
import { getAdminData } from "@/lib/queries/admin";
import { AdminView } from "@/components/admin-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Анкеты",
  robots: { index: false, follow: false },
};

export default async function AdminSectionPage() {
  // проверка роли повторяется на странице: layout защитой не является
  // роль читается из базы, мимо кэша сессии в куке: снятая роль и
  // блокировка должны закрывать админку сразу
  const session = await getSessionUncached(await headers());
  if (!session) redirect("/login?next=/admin/profiles");
  if (session.user.role !== "admin") notFound();

  const data = await getAdminData();
  return <AdminView data={data} currentUserId={session.user.id} section="profiles" />;
}
