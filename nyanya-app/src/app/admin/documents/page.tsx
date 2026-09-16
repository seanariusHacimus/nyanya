import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getSessionUncached } from "@/lib/auth";
import { getDocumentQueue } from "@/lib/queries/admin";
import { parsePage } from "@/lib/admin-params";
import { AdminDocumentQueue } from "@/components/admin/admin-document-queue";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Документы на проверке",
  robots: { index: false, follow: false },
};

export default async function AdminDocumentsPage({
  searchParams,
}: {
  // в Next 16 searchParams — промис, значения доступны только через await
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // проверка роли повторяется на странице: layout защитой не является
  // роль читается из базы, мимо кэша сессии в куке: снятая роль и
  // блокировка должны закрывать админку сразу
  const session = await getSessionUncached(await headers());
  if (!session) redirect("/login?next=/admin/documents");
  if (session.user.role !== "admin") notFound();

  const sp = await searchParams;
  const result = await getDocumentQueue(parsePage(sp.page));

  return <AdminDocumentQueue result={result} />;
}
