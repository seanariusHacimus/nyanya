import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { getSession } from "@/lib/session";
import { getSpecialistByUserId, getCities } from "@/lib/queries";
import { SpecialistProfileForm } from "@/components/specialist-profile-form";
import { TrustSeal } from "@/components/trust-seal";
import { VerificationBadge } from "@/components/verification-badge";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function SpecialistPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);

  const profile = await getSpecialistByUserId(session.user.id);
  const t = await getTranslations("specialist");

  if (!profile) {
    const cities = await getCities();
    return (
      <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-4xl font-semibold text-ink">{t("createTitle")}</h1>
        <p className="mt-2 text-muted-foreground">{t("createSubtitle")}</p>
        <div className="mt-8">
          <SpecialistProfileForm cities={cities} />
        </div>
      </section>
    );
  }

  const common = await getTranslations("common");
  const tp = await getTranslations("profile");

  const statusMsg =
    profile.status === "active"
      ? t("active")
      : profile.status === "pending_review"
        ? t("pending")
        : profile.status === "rejected"
          ? t("rejected")
          : profile.status === "hidden"
            ? t("hidden")
            : t("draft");

  const stats = [
    { label: common("trustScore"), value: profile.trustScore },
    { label: tp("reviewsTitle"), value: profile.reviewCount },
    { label: tp("experience"), value: `${profile.experienceYears} ${common("years")}` },
  ];

  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-4xl font-semibold text-ink">{t("dashboardTitle")}</h1>
        {profile.status === "active" && (
          <Link
            href={`/catalog/${profile.id}`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            {t("viewPublic")}
          </Link>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-line bg-card p-6">
        <div className="flex flex-wrap items-center gap-5">
          <TrustSeal score={profile.trustScore} size={84} />
          <div>
            <p className="font-display text-2xl text-ink">{profile.fullName}</p>
            <div className="mt-1.5">
              <VerificationBadge level={profile.verificationLevel} />
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-line bg-ivory-deep/40 p-3 text-sm text-muted-foreground">
          {statusMsg}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-line p-3 text-center">
              <p className="font-display text-2xl font-semibold text-ink">{s.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-line bg-card p-6">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-ink">
          <FileText className="size-5 text-royal" />
          {t("documentsTitle")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("docNote")}</p>
      </div>
    </section>
  );
}
