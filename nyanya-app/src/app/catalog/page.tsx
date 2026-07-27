import { Suspense } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { CatalogView } from "@/components/catalog-view";
import { getActiveSpecialists } from "@/lib/queries/specialists";
import { getFavoriteSlugs } from "@/lib/queries/account";

export const dynamic = "force-dynamic"; // данные из PostgreSQL на каждый запрос

export const metadata = {
  title: "Каталог специалистов",
  description:
    "Проверенные няни, сиделки, репетиторы и водители в Ташкенте. Фильтры по району, цене и опыту, индекс доверия и отзывы.",
};

export default async function CatalogPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const [specialists, favoriteSlugs] = await Promise.all([
    getActiveSpecialists(),
    session ? getFavoriteSlugs(session.user.id) : Promise.resolve([]),
  ]);

  return (
    <main className="flex-1">
      <Suspense>
        <CatalogView
          specialists={specialists}
          favoriteSlugs={favoriteSlugs}
          authed={Boolean(session)}
        />
      </Suspense>
    </main>
  );
}
