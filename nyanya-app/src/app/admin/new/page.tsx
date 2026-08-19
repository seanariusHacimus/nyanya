import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDistrictOptions } from "@/lib/queries/districts";
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

  const rows = await getDistrictOptions();

  return (
    <div className="max-w-[760px]">
      <h1 className="font-display text-3xl leading-[1.08] font-medium text-ink sm:text-4xl">
        Новая анкета
      </h1>
      <p className="mt-4 text-base leading-relaxed text-ink-soft">
        Заводит аккаунт специалиста и анкету к нему. Специалист сможет войти по
        этой почте и дальше вести анкету сам.
      </p>

      <div className="mt-10">
        <CreateSpecialistForm districts={rows} />
      </div>
    </div>
  );
}
