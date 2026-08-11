import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { districts } from "@/db/schema";
import { CreateSpecialistForm } from "@/components/admin/create-specialist-form";

/**
 * Добавление анкеты администратором.
 *
 * Роль проверяется здесь, а не только в layout: layout защитой не является,
 * а страница — это отдельный сетевой адрес.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Новая анкета",
  robots: { index: false, follow: false },
};

export default async function AdminNewProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login?next=/admin/new");
  if (session.user.role !== "admin") notFound();

  const rows = await db
    .select({ id: districts.id, name: districts.nameRu })
    .from(districts)
    .orderBy(asc(districts.nameRu));

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-[900px] px-5 pt-14 pb-24 sm:px-8 lg:pt-20">
        <Link
          href="/admin"
          className="label-caps text-ink-soft transition-colors duration-300 hover:text-ink"
        >
          ← Админ-панель
        </Link>
        <h1 className="mt-4 font-display text-4xl leading-[1.08] font-medium text-ink sm:text-5xl">
          Новая анкета
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-soft">
          Заводит аккаунт специалиста и анкету к нему. Специалист сможет войти
          по этой почте и дальше вести анкету сам.
        </p>

        <div className="mt-12">
          <CreateSpecialistForm districts={rows} />
        </div>
      </div>
    </main>
  );
}
