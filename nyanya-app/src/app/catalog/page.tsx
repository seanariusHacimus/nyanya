import { Suspense } from "react";
import { CatalogView } from "@/components/catalog-view";

export const metadata = {
  title: "Каталог специалистов",
  description:
    "Проверенные няни, сиделки, репетиторы и водители в Ташкенте. Фильтры по району, цене и опыту, индекс доверия и отзывы.",
};

export default function CatalogPage() {
  return (
    <main className="flex-1">
      <Suspense>
        <CatalogView />
      </Suspense>
    </main>
  );
}
