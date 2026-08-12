import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { getAdminData } from "@/lib/queries/admin";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

/**
 * Каркас админки: сайдбар слева, раздел справа.
 *
 * Роль проверяется здесь — но это НЕ защита. Layout в Next не выполняется
 * повторно при переходах внутри сегмента, и полагаться на него нельзя:
 * каждая страница раздела проверяет сессию и роль сама, и каждое серверное
 * действие тоже.
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login?next=/admin");
  if (session.user.role !== "admin") notFound();

  const data = await getAdminData();

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-[1400px] px-5 pt-10 pb-24 sm:px-8 lg:pt-14">
        <p className="label-caps text-bronze-text">Админ-панель</p>
        <div className="mt-6 grid gap-8 lg:grid-cols-[220px_1fr] lg:gap-12">
          <AdminSidebar
            counts={{
              pendingProfiles: data.stats.pendingProfiles,
              pendingDocuments: data.stats.pendingDocuments,
              profiles: data.profiles.length,
              users: data.usersTotal,
            }}
          />
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </main>
  );
}
