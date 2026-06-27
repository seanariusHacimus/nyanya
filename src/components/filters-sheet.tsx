"use client";

import { SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { buttonVariants } from "@/components/ui/button";
import { CatalogFilters } from "./catalog-filters";
import { cn } from "@/lib/utils";

type CityRow = { id: number; nameRu: string; nameUz: string; nameEn: string };

export function FiltersSheet({ cities }: { cities: CityRow[] }) {
  const t = useTranslations("catalog");
  return (
    <Sheet>
      <SheetTrigger
        className={cn(buttonVariants({ variant: "outline" }), "gap-2 lg:hidden")}
      >
        <SlidersHorizontal className="size-4" />
        {t("filtersTitle")}
      </SheetTrigger>
      <SheetContent side="left" className="overflow-y-auto bg-ivory">
        <SheetTitle className="px-5 pt-5 font-display text-2xl">
          {t("filtersTitle")}
        </SheetTitle>
        <div className="p-5">
          <CatalogFilters cities={cities} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
