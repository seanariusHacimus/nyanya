"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { saveSpecialistProfile } from "@/lib/actions/specialist";
import {
  CATEGORIES,
  PRICE_UNITS,
  ENGLISH_LEVELS,
  type Category,
  type PriceUnit,
  type EnglishLevel,
} from "@/lib/constants";
import { localizedName } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CityRow = { id: number; nameRu: string; nameUz: string; nameEn: string };
const LANGS = ["Русский", "Узбекский", "Английский"];

export function SpecialistProfileForm({ cities }: { cities: CityRow[] }) {
  const t = useTranslations("specialist");
  const tp = useTranslations("profile");
  const cat = useTranslations("categories");
  const common = useTranslations("common");
  const catalogT = useTranslations("catalog");
  const locale = useLocale();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<Category>("nanny");
  const [cityId, setCityId] = useState("");
  const [priceUnit, setPriceUnit] = useState<PriceUnit>("hour");
  const [englishLevel, setEnglishLevel] = useState<EnglishLevel>("none");
  const [languages, setLanguages] = useState<string[]>(["Русский"]);
  const [flags, setFlags] = useState({
    hasCar: false,
    liveIn: false,
    nightAvailable: false,
    newbornExp: false,
  });

  const unitLabel = (u: PriceUnit) =>
    (u === "hour" ? common("perHour") : u === "day" ? common("perDay") : common("perMonth")).split("/")[1];
  const englishLabel = (l: EnglishLevel) =>
    l === "fluent" ? tp("englishFluent") : l === "basic" ? tp("englishBasic") : tp("englishNone");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    const res = await saveSpecialistProfile({
      category,
      fullName: String(fd.get("fullName") ?? ""),
      birthDate: String(fd.get("birthDate") ?? "") || undefined,
      cityId: cityId ? Number(cityId) : undefined,
      experienceYears: Number(fd.get("experienceYears") ?? 0),
      education: String(fd.get("education") ?? "") || undefined,
      languages,
      priceAmount: Number(fd.get("priceAmount") ?? 0),
      priceUnit,
      description: String(fd.get("description") ?? "") || undefined,
      englishLevel,
      ...flags,
    });
    setLoading(false);
    if (res.ok) {
      toast.success(t("saved"));
      router.push("/specialist");
      router.refresh();
    } else if (res.reason === "auth") {
      router.push("/login");
    } else {
      toast.error(common("error"));
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="fullName">{t("fullName")}</Label>
          <Input id="fullName" name="fullName" required />
        </div>
        <div className="space-y-1.5">
          <Label>{catalogT("category")}</Label>
          <Select items={Object.fromEntries(CATEGORIES.map((c) => [c, cat(c)]))} value={category} onValueChange={(v) => v && setCategory(v as Category)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {cat(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="birthDate">{t("birthDate")}</Label>
          <Input id="birthDate" name="birthDate" type="date" />
        </div>
        <div className="space-y-1.5">
          <Label>{catalogT("city")}</Label>
          <Select items={Object.fromEntries(cities.map((c) => [String(c.id), localizedName(locale, c.nameRu, c.nameUz, c.nameEn)]))} value={cityId} onValueChange={(v) => setCityId(v ?? "")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {cities.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {localizedName(locale, c.nameRu, c.nameUz, c.nameEn)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="experienceYears">{t("experienceYears")}</Label>
          <Input id="experienceYears" name="experienceYears" type="number" min={0} defaultValue={1} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="education">{tp("education")}</Label>
          <Input id="education" name="education" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div className="space-y-1.5">
          <Label htmlFor="priceAmount">{t("priceAmount")}</Label>
          <Input id="priceAmount" name="priceAmount" type="number" min={0} required />
        </div>
        <div className="space-y-1.5">
          <Label>{t("priceUnit")}</Label>
          <Select items={Object.fromEntries(PRICE_UNITS.map((u) => [u, unitLabel(u)]))} value={priceUnit} onValueChange={(v) => v && setPriceUnit(v as PriceUnit)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRICE_UNITS.map((u) => (
                <SelectItem key={u} value={u}>
                  {unitLabel(u)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>{tp("languages")}</Label>
        <div className="flex flex-wrap gap-3">
          {LANGS.map((l) => (
            <label key={l} className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={languages.includes(l)}
                onCheckedChange={(c) =>
                  setLanguages((prev) => (c ? [...prev, l] : prev.filter((x) => x !== l)))
                }
              />
              {l}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>{tp("english")}</Label>
        <Select items={Object.fromEntries(ENGLISH_LEVELS.map((l) => [l, englishLabel(l)]))} value={englishLevel} onValueChange={(v) => v && setEnglishLevel(v as EnglishLevel)}>
          <SelectTrigger className="w-full sm:w-60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENGLISH_LEVELS.map((l) => (
              <SelectItem key={l} value={l}>
                {englishLabel(l)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">{tp("about")}</Label>
        <Textarea id="description" name="description" rows={4} />
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {([
          ["hasCar", tp("hasCar")],
          ["liveIn", tp("liveIn")],
          ["nightAvailable", tp("nightAvailable")],
          ["newbornExp", tp("newborn")],
        ] as const).map(([key, label]) => (
          <label key={key} className="flex cursor-pointer items-center gap-2.5 text-sm">
            <Checkbox
              checked={flags[key]}
              onCheckedChange={(c) => setFlags((f) => ({ ...f, [key]: !!c }))}
            />
            {label}
          </label>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">{t("listingFeeNote")}</p>
      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-royal text-primary-foreground hover:bg-royal-deep"
      >
        {t("save")}
      </Button>
    </form>
  );
}
