import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getSessionUncached } from "@/lib/auth";
import { searchUsers } from "@/lib/queries/admin";
import { parsePage, parseQuery } from "@/lib/admin-params";
import { AdminUsersTable } from "@/components/admin/admin-users-table";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Пользователи",
  robots: { index: false, follow: false },
};

export default async function AdminUsersPage({
  searchParams,
}: {
  // в Next 16 searchParams — промис, значения доступны только через await
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // проверка роли повторяется на странице: layout защитой не является
  // роль читается из базы, мимо кэша сессии в куке: снятая роль и
  // блокировка должны закрывать админку сразу
  const session = await getSessionUncached(await headers());
  if (!session) redirect("/login?next=/admin/users");
  if (session.user.role !== "admin") notFound();

  const sp = await searchParams;
  const q = parseQuery(sp.q);
  const page = parsePage(sp.page);
  const result = await searchUsers({ q, page });

  return (
    <AdminUsersTable result={result} q={q} currentUserId={session.user.id} />
  );
}
