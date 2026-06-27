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

  const city = localizedName(
    locale,
    item.cityNameRu ?? "",
    item.cityNameUz ?? "",
    item.cityNameEn ?? "",
  );
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
      className="group block overflow-hidden rounded-2xl border border-line bg-card transition-all hover:border-champagne hover:shadow-[0_24px_60px_-32px_rgba(44,26,79,0.45)]"
    >
      <div className="relative">
        <SpecialistAvatar
          name={item.fullName}
          photoKey={item.photoKey}
          className="aspect-[4/5] w-full"
          rounded="rounded-none"
          monogramClass="text-6xl"
        />
        <div className="absolute left-3 top-3">
          <VerificationBadge level={item.verificationLevel} />
        </div>
        <div className="absolute -bottom-6 right-3 rounded-full bg-card p-1 shadow-[0_10px_24px_-8px_rgba(44,26,79,0.4)]">
          <TrustSeal score={item.trustScore} size={62} />
        </div>
      </div>
      <div className="p-4 pt-7">
        <p className="text-[11px] uppercase tracking-[0.18em] text-gold-ink">
          {cat(item.category)}
        </p>
        <h3 className="mt-1 font-display text-xl font-semibold leading-tight text-ink">
          {item.fullName}
          {age ? `, ${age}` : ""}
        </h3>
        {city && (
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-3.5" />
            {city}
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
        <div className="mt-3 border-t border-line pt-3 text-sm">
          <span className="text-muted-foreground">{t("fromPrice")} </span>
          <span className="font-semibold text-ink">{formatUZS(item.priceAmount)}</span>
          <span className="text-muted-foreground"> {unit}</span>
        </div>
      </div>
    </Link>
  );
}
