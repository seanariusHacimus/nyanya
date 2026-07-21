"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CatalogSort() {
  const t = useTranslations("catalog");
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const value = sp.get("sort") ?? "trust";

  function set(v: string | null) {
    const params = new URLSearchParams(sp.toString());
    if (!v || v === "trust") params.delete("sort");
    else params.set("sort", v);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  const items = {
    trust: t("sortTrust"),
    price_asc: t("sortPriceAsc"),
    price_desc: t("sortPriceDesc"),
    experience: t("sortExperience"),
  };

  return (
    <Select items={items} value={value} onValueChange={set}>
      <SelectTrigger className="w-[190px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="trust">{t("sortTrust")}</SelectItem>
        <SelectItem value="price_asc">{t("sortPriceAsc")}</SelectItem>
        <SelectItem value="price_desc">{t("sortPriceDesc")}</SelectItem>
        <SelectItem value="experience">{t("sortExperience")}</SelectItem>
      </SelectContent>
    </Select>
  );
}
