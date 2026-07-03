"use client";

import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/navigation";
import { CATEGORIES } from "@/lib/constants";
import { localizedName, formatUZS, LANGUAGES } from "@/lib/format";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type DistrictRow = { id: number; nameRu: string; nameUz: string; nameEn: string };

const ALL = "__all";
const PRICES = [30000, 50000, 80000, 150000];
const EXPS = [1, 3, 5, 10];
const TOGGLES = ["english", "hasCar", "liveIn", "night", "newborn"] as const;

export function CatalogFilters({ districts }: { districts: DistrictRow[] }) {
  const t = useTranslations("catalog");
  const cat = useTranslations("categories");
  const common = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function setParam(key: string, value?: string | null) {
    const params = new URLSearchParams(sp.toString());
    if (!value) params.delete(key);
    else params.set(key, value);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  const fieldSelect = (
    key: string,
    label: string,
    anyLabel: string,
    options: { value: string; label: string }[],
  ) => {
    const items: Record<string, string> = { [ALL]: anyLabel };
    for (const o of options) items[o.value] = o.label;
    return (
      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wider text-gold-ink">{label}</Label>
        <Select
          items={items}
          value={sp.get(key) ?? ALL}
          onValueChange={(v) => setParam(key, v === ALL ? null : v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{anyLabel}</SelectItem>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {fieldSelect(
        "category",
        t("category"),
        common("all"),
        CATEGORIES.map((c) => ({ value: c, label: cat(c) })),
      )}
      {fieldSelect(
        "district",
        t("district"),
        t("anyDistrict"),
        districts.map((d) => ({
          value: String(d.id),
          label: localizedName(locale, d.nameRu, d.nameUz, d.nameEn),
        })),
      )}
      {fieldSelect(
        "maxPrice",
        t("maxPrice"),
        t("anyPrice"),
        PRICES.map((p) => ({ value: String(p), label: formatUZS(p) })),
      )}
      {fieldSelect(
        "minExp",
        t("minExperience"),
        t("anyExperience"),
        EXPS.map((e) => ({ value: String(e), label: t("yearsShort", { n: e }) })),
      )}
      {fieldSelect(
        "language",
        t("language"),
        t("anyLanguage"),
        LANGUAGES.map((l) => ({
          value: l.value,
          label: localizedName(locale, l.ru, l.uz, l.en),
        })),
      )}

      <div className="space-y-2.5 border-t border-line pt-4">
        {TOGGLES.map((key) => (
          <label key={key} className="flex cursor-pointer items-center gap-2.5 text-sm">
            <Checkbox
              checked={sp.get(key) === "1"}
              onCheckedChange={(c) => setParam(key, c ? "1" : null)}
            />
            <span className="text-ink">{t(key)}</span>
          </label>
        ))}
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => router.replace(pathname)}
      >
        {t("reset")}
      </Button>
    </div>
  );
}
