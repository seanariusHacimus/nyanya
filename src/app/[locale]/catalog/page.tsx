import { getTranslations } from "next-intl/server";
import { SearchX } from "lucide-react";
import { getCatalog, getCities, type CatalogFilters as CF } from "@/lib/queries";
import { CATEGORIES, type Category } from "@/lib/constants";
import { SpecialistCard } from "@/components/specialist-card";
import { CatalogFilters } from "@/components/catalog-filters";
import { CatalogSort } from "@/components/catalog-sort";
import { FiltersSheet } from "@/components/filters-sheet";

export default async function CatalogPage({
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const category = CATEGORIES.includes(sp.category as Category)
    ? (sp.category as Category)
    : undefined;

  const filters: CF = {
    category,
    cityId: sp.city ? Number(sp.city) : undefined,
    maxPrice: sp.maxPrice ? Number(sp.maxPrice) : undefined,
    minExperience: sp.minExp ? Number(sp.minExp) : undefined,
    language: sp.language || undefined,
    english: sp.english === "1",
    hasCar: sp.hasCar === "1",
    liveIn: sp.liveIn === "1",
    nightAvailable: sp.night === "1",
    newborn: sp.newborn === "1",
    sort: (sp.sort as CF["sort"]) ?? "trust",
  };

  const [items, cities] = await Promise.all([getCatalog(filters), getCities()]);
  const t = await getTranslations("catalog");

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold text-ink">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("found", { count: items.length })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FiltersSheet cities={cities} />
          <CatalogSort />
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <CatalogFilters cities={cities} />
          </div>
        </aside>
        <div>
          {items.length === 0 ? (
            <div className="grid place-items-center rounded-2xl border border-dashed border-line py-24 text-center">
              <SearchX className="size-10 text-muted-foreground" />
              <p className="mt-4 font-display text-2xl text-ink">{t("empty")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("emptyHint")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <SpecialistCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
