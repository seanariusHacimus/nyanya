import { getTranslations, getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import {
  Star,
  GraduationCap,
  Languages as LanguagesIcon,
  MapPin,
  Briefcase,
  Car,
  Home,
  Moon,
  Baby,
  Globe,
} from "lucide-react";
import {
  getSpecialistById,
  getReviews,
  getSpecialistContacts,
  isUnlocked,
  isFavorite,
} from "@/lib/queries";
import { getSession } from "@/lib/session";
import { SpecialistAvatar } from "@/components/specialist-avatar";
import { TrustSeal } from "@/components/trust-seal";
import { VerificationBadge } from "@/components/verification-badge";
import { UnlockPanel } from "@/components/unlock-panel";
import { FavoriteButton } from "@/components/favorite-button";
import { formatUZS, localizedName, ageFromBirthDate, localizeLanguage } from "@/lib/format";
import { UNLOCK_FEE } from "@/lib/providers/payment";

export default async function SpecialistPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;
  const spec = await getSpecialistById(id);
  if (!spec || spec.status !== "active") notFound();

  const session = await getSession();
  const user = session?.user ?? null;
  const authed = !!user;
  const [reviews, unlocked, favorited] = await Promise.all([
    getReviews(id),
    user ? isUnlocked(user.id, id) : Promise.resolve(false),
    user ? isFavorite(user.id, id) : Promise.resolve(false),
  ]);
  const contacts = unlocked ? await getSpecialistContacts(spec.userId) : null;

  const locale = await getLocale();
  const t = await getTranslations("profile");
  const common = await getTranslations("common");
  const cat = await getTranslations("categories");

  const city = localizedName(locale, spec.cityNameRu ?? "", spec.cityNameUz ?? "", spec.cityNameEn ?? "");
  const district = localizedName(locale, spec.districtNameRu ?? "", spec.districtNameUz ?? "", spec.districtNameEn ?? "");
  const age = spec.birthDate ? ageFromBirthDate(spec.birthDate) : null;
  const unit =
    spec.priceUnit === "hour" ? common("perHour") : spec.priceUnit === "day" ? common("perDay") : common("perMonth");
  const englishLabel =
    spec.englishLevel === "fluent" ? t("englishFluent") : spec.englishLevel === "basic" ? t("englishBasic") : t("englishNone");
  const currencyWord = common("perHour").split("/")[0];
  const priceLabel = `${formatUZS(UNLOCK_FEE)} ${currencyWord}`;
  const description = localizedName(locale, spec.description ?? "", spec.descriptionUz ?? "", spec.descriptionEn ?? "");
  const education = localizedName(locale, spec.education ?? "", spec.educationUz ?? "", spec.educationEn ?? "");
  const fullName = localizedName(locale, spec.fullName, spec.fullNameLatin ?? "", spec.fullNameLatin ?? "");

  const features = [
    spec.hasCar && { icon: Car, label: t("hasCar") },
    spec.liveIn && { icon: Home, label: t("liveIn") },
    spec.nightAvailable && { icon: Moon, label: t("nightAvailable") },
    spec.newbornExp && { icon: Baby, label: t("newborn") },
  ].filter(Boolean) as { icon: typeof Car; label: string }[];

  const attrs = [
    education && { icon: GraduationCap, label: t("education"), value: education },
    { icon: LanguagesIcon, label: t("languages"), value: spec.languages.map((l) => localizeLanguage(locale, l)).join(", ") },
    { icon: Briefcase, label: t("experience"), value: `${spec.experienceYears} ${common("years")}` },
    { icon: Globe, label: t("english"), value: englishLabel },
  ].filter(Boolean) as { icon: typeof Car; label: string; value: string }[];

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-[360px_1fr]">
        {/* left rail */}
        <div className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <div className="relative">
            <SpecialistAvatar
              name={fullName}
              photoKey={spec.photoKey}
              className="aspect-[4/5] w-full"
              monogramClass="text-7xl"
            />
            <div className="absolute -bottom-5 right-4 rounded-full bg-card p-1.5 shadow-[0_12px_30px_-8px_rgba(44,26,79,0.4)]">
              <TrustSeal score={spec.trustScore} size={92} />
            </div>
          </div>
          <div className="space-y-4 rounded-2xl border border-line bg-card p-5">
            <UnlockPanel
              specialistId={spec.id}
              priceLabel={priceLabel}
              unlocked={unlocked}
              authed={authed}
              phone={contacts?.phone ?? null}
            />
            <FavoriteButton specialistId={spec.id} initial={favorited} authed={authed} />
          </div>
        </div>

        {/* main */}
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <VerificationBadge level={spec.verificationLevel} />
          </div>

          <p className="mt-4 text-xs uppercase tracking-[0.22em] text-gold-ink">{cat(spec.category)}</p>
          <h1 className="mt-1 font-display text-4xl font-semibold text-ink sm:text-5xl">
            {fullName}
            {age ? `, ${age}` : ""}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
            {(city || district) && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-4" />
                {[city, district].filter(Boolean).join(", ")}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Briefcase className="size-4" />
              {spec.experienceYears} {common("years")}
            </span>
            {spec.reviewCount > 0 && (
              <span className="inline-flex items-center gap-1 text-ink">
                <Star className="size-4 fill-champagne text-champagne" />
                {Number(spec.ratingAvg).toFixed(1)}
                <span className="text-muted-foreground">
                  ({spec.reviewCount} {common("reviews")})
                </span>
              </span>
            )}
          </div>

          <div className="mt-5 inline-flex items-baseline gap-1.5 rounded-xl border border-line bg-ivory-deep/40 px-4 py-2">
            <span className="text-sm text-muted-foreground">{common("fromPrice")}</span>
            <span className="font-display text-2xl font-semibold text-ink">{formatUZS(spec.priceAmount)}</span>
            <span className="text-sm text-muted-foreground">{unit}</span>
          </div>

          {description && (
            <div className="mt-8">
              <h2 className="font-display text-xl font-semibold text-ink">{t("about")}</h2>
              <p className="mt-2 leading-relaxed text-muted-foreground">{description}</p>
            </div>
          )}

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {attrs.map((a) => (
              <div key={a.label} className="rounded-xl border border-line bg-card p-4">
                <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-gold-ink">
                  <a.icon className="size-3.5" />
                  {a.label}
                </p>
                <p className="mt-1.5 text-ink">{a.value}</p>
              </div>
            ))}
          </div>

          {features.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {features.map((f) => (
                <span
                  key={f.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-royal/20 bg-royal/5 px-3 py-1 text-sm text-royal"
                >
                  <f.icon className="size-3.5" />
                  {f.label}
                </span>
              ))}
            </div>
          )}

          <div className="mt-10">
            <h2 className="font-display text-2xl font-semibold text-ink">{t("reviewsTitle")}</h2>
            {reviews.length === 0 ? (
              <p className="mt-3 text-muted-foreground">{t("noReviews")}</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {reviews.map((r) => (
                  <li key={r.id} className="rounded-xl border border-line bg-card p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-ink">{r.authorName}</span>
                      <span className="inline-flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={
                              i < r.rating
                                ? "size-3.5 fill-champagne text-champagne"
                                : "size-3.5 text-line"
                            }
                          />
                        ))}
                      </span>
                    </div>
                    {localizedName(locale, r.text ?? "", r.textUz ?? "", r.textEn ?? "") && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {localizedName(locale, r.text ?? "", r.textUz ?? "", r.textEn ?? "")}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
