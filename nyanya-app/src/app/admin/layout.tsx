import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSessionUncached } from "@/lib/auth";
import { getAdminNavCounts } from "@/lib/queries/admin";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

/**
 * Каркас админки: сайдбар слева, раздел справа.
 *
 * Роль проверяется здесь — но это НЕ защита. Layout в Next не выполняется
 * повторно при переходах внутри сегмента, и полагаться на него нельзя:
 * каждая страница раздела проверяет сессию и роль сама, и каждое серверное
 * действие тоже.
 *
 * Данных каркас берёт ровно столько, сколько показывает: четыре счётчика для
 * бейджей. Их он делит со страницей раздела через React `cache` внутри одного
 * рендера — раньше и каркас, и страница вызывали общую `getAdminData`,
 * которая выгружала все анкеты и все документы, то есть дважды на запрос.
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  // роль читается из базы, мимо кэша сессии в куке: снятая роль и
  // блокировка должны закрывать админку сразу
  const session = await getSessionUncached(await headers());
  if (!session) redirect("/login?next=/admin");
  if (session.user.role !== "admin") notFound();

  const counts = await getAdminNavCounts();

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-[1400px] px-5 pt-10 pb-24 sm:px-8 lg:pt-14">
        <p className="label-caps text-bronze-text">Админ-панель</p>
        <div className="mt-6 grid gap-8 lg:grid-cols-[220px_1fr] lg:gap-12">
          <AdminSidebar counts={counts} />
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </main>
  );
}
