import { useTranslations, useLocale } from "next-intl";
import { MapPin, Briefcase, Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { SpecialistAvatar } from "./specialist-avatar";
import { TrustSeal } from "./trust-seal";
import { VerificationBadge } from "./verification-badge";
import { formatUZS, localizedName, ageFromBirthDate } from "@/lib/format";
import type { CatalogItem } from "@/lib/queries";

export function SpecialistCard({ item }: { item: CatalogItem }) {
  const t = useTranslations("common");
  const cat = useTranslations("categories");
  const locale = useLocale();

  const district = localizedName(
    locale,
    item.districtNameRu ?? "",
    item.districtNameUz ?? "",
    item.districtNameEn ?? "",
  );
  const name = localizedName(locale, item.fullName, item.fullNameLatin ?? "", item.fullNameLatin ?? "");
  const age = item.birthDate ? ageFromBirthDate(item.birthDate) : null;
  const unit =
    item.priceUnit === "hour"
      ? t("perHour")
      : item.priceUnit === "day"
        ? t("perDay")
        : t("perMonth");

  return (
    <Link
      href={`/catalog/${item.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-card transition-all hover:border-champagne hover:shadow-[0_24px_60px_-32px_rgba(22,17,12,0.45)]"
    >
      <div className="relative">
        <SpecialistAvatar
          name={name}
          photoKey={item.photoKey}
          className="aspect-[4/5] w-full"
          rounded="rounded-none"
          monogramClass="text-6xl"
        />
        <div className="absolute left-3 top-3">
          <VerificationBadge level={item.verificationLevel} />
        </div>
        <div className="absolute -bottom-5 right-4 rounded-full bg-card p-1.5 shadow-[0_14px_30px_-12px_rgba(22,17,12,0.5)] ring-1 ring-line">
          <TrustSeal score={item.trustScore} size={58} />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4 pt-7">
        <p className="text-[11px] uppercase tracking-[0.18em] text-gold-ink">
          {cat(item.category)}
        </p>
        <h3 className="mt-1 font-display text-xl font-semibold leading-tight text-ink">
          {name}
          {age ? `, ${age}` : ""}
        </h3>
        {district && (
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-3.5" />
            {district}
          </p>
        )}
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Briefcase className="size-3.5" />
            {item.experienceYears} {t("years")}
          </span>
          {item.reviewCount > 0 && (
            <span className="inline-flex items-center gap-1 text-ink">
              <Star className="size-3.5 fill-champagne text-champagne" />
              {Number(item.ratingAvg).toFixed(1)}
              <span className="text-muted-foreground">({item.reviewCount})</span>
            </span>
          )}
        </div>
        <div className="mt-auto border-t border-line pt-3 text-sm">
          <span className="text-muted-foreground">{t("fromPrice")} </span>
          <span className="font-semibold text-ink">{formatUZS(item.priceAmount)}</span>
          <span className="text-muted-foreground"> {unit}</span>
        </div>
      </div>
    </Link>
  );
}
