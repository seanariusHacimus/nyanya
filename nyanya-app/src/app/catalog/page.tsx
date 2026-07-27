import { Suspense } from "react";
import { CatalogView } from "@/components/catalog-view";
import { getActiveSpecialists } from "@/lib/queries/specialists";

export const dynamic = "force-dynamic"; // данные из PostgreSQL на каждый запрос

export const metadata = {
  title: "Каталог специалистов",
  description:
    "Проверенные няни, сиделки, репетиторы и водители в Ташкенте. Фильтры по району, цене и опыту, индекс доверия и отзывы.",
};

export default async function CatalogPage() {
  const specialists = await getActiveSpecialists();

  return (
    <main className="flex-1">
      <Suspense>
        <CatalogView specialists={specialists} />
      </Suspense>
    </main>
  );
}
