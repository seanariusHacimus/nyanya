import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAdminData } from "@/lib/queries/admin";
import { AdminView } from "@/components/admin-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Пользователи",
  robots: { index: false, follow: false },
};

export default async function AdminSectionPage() {
  // проверка роли повторяется на странице: layout защитой не является
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login?next=/admin/users");
  if (session.user.role !== "admin") notFound();

  const data = await getAdminData();
  return <AdminView data={data} currentUserId={session.user.id} section="users" />;
}
