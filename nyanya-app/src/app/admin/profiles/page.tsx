import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getSessionUncached } from "@/lib/auth";
import { getAdminProfilesPage, getProfileTotals } from "@/lib/queries/admin";
import { parsePage, parseQuery, parseStatus } from "@/lib/admin-params";
import { AdminProfilesTable } from "@/components/admin/admin-profiles-table";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Анкеты",
  robots: { index: false, follow: false },
};

export default async function AdminProfilesPage({
  searchParams,
}: {
  // в Next 16 searchParams — промис, значения доступны только через await
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // проверка роли повторяется на странице: layout защитой не является
  // роль читается из базы, мимо кэша сессии в куке: снятая роль и
  // блокировка должны закрывать админку сразу
  const session = await getSessionUncached(await headers());
  if (!session) redirect("/login?next=/admin/profiles");
  if (session.user.role !== "admin") notFound();

  const sp = await searchParams;
  const status = parseStatus(sp.status);
  const q = parseQuery(sp.q);
  const page = parsePage(sp.page);

  // totals — подпись «Опубликовано X из Y»; тот же GROUP BY, что уже посчитал
  // бейдж «Анкеты» в сайдбаре, поэтому лишнего запроса не будет
  const [totals, result] = await Promise.all([
    getProfileTotals(),
    getAdminProfilesPage({ page, status, q }),
  ]);

  return (
    <AdminProfilesTable result={result} totals={totals} status={status} q={q} />
  );
}
