import Image from "next/image";
import { getTranslations, getLocale } from "next-intl/server";
import { ShieldCheck, Gauge, MessageCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { CategoryChooser } from "@/components/category-chooser";
import { TrustSeal } from "@/components/trust-seal";
import { VerificationBadge } from "@/components/verification-badge";
import { getFeaturedSpecialist } from "@/lib/queries";
import { localizedName } from "@/lib/format";

export default async function HomePage() {
  const t = await getTranslations("home");
  const c = await getTranslations("categories");
  const locale = await getLocale();
  const featured = await getFeaturedSpecialist();

  const heroPhoto = featured?.photoKey ?? "/media/hero.png";
  const heroName = featured
    ? localizedName(locale, featured.fullName, featured.fullNameLatin ?? "", featured.fullNameLatin ?? "")
    : t("heroName");
  const heroCity = featured
    ? localizedName(locale, featured.cityNameRu ?? "", featured.cityNameUz ?? "", featured.cityNameEn ?? "")
    : t("heroCity");
  const heroCategory = c(featured?.category ?? "nanny");
  const heroHref = featured ? `/catalog/${featured.id}` : "/catalog";

  const features = [
    { icon: ShieldCheck, title: t("feature1Title"), desc: t("feature1Desc") },
    { icon: Gauge, title: t("feature2Title"), desc: t("feature2Desc") },
    { icon: MessageCircle, title: t("feature3Title"), desc: t("feature3Desc") },
  ];
  const [lead, ...rest] = features;

  const steps = [
    { title: t("step1Title"), desc: t("step1Desc") },
    { title: t("step2Title"), desc: t("step2Desc") },
    { title: t("step3Title"), desc: t("step3Desc") },
  ];

  return (
    <>
      {/* HERO - espresso color block, cream serif with italic emphasis */}
      <section className="relative overflow-hidden bg-espresso text-ivory">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background:radial-gradient(55%_45%_at_82%_8%,color-mix(in_oklab,var(--champagne)_12%,transparent),transparent_60%)]"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div className="surface-dark animate-rise">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-champagne">
              {t("heroEyebrow")}
            </p>
            <h1 className="mt-5 pb-1 font-display text-5xl font-medium leading-[1.1] tracking-tight text-ivory sm:text-6xl">
              {t.rich("heroTitle", {
                i: (chunks) => <em className="italic">{chunks}</em>,
              })}
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-ivory/70">
              {t("heroSub")}
            </p>

            <div className="mt-9">
              <p className="mb-3 text-sm font-medium text-ivory/60">{t("chooseCategory")}</p>
              <CategoryChooser />
            </div>
          </div>

          {/* Featured specialist - clicks through to the profile */}
          <Link
            href={heroHref}
            className="group animate-rise relative mx-auto block w-full max-w-md [animation-delay:120ms] lg:mr-0"
          >
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl shadow-[0_40px_80px_-30px_rgba(0,0,0,0.75)] ring-1 ring-ivory/10 transition-transform duration-300 group-hover:-translate-y-1">
              <Image
                src={heroPhoto}
                alt={heroName}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 460px"
                className="object-cover object-top"
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-espresso-deep/85 via-espresso-deep/15 to-transparent"
              />
              <div className="absolute left-5 top-5">
                <VerificationBadge level={featured?.verificationLevel ?? "premium_verified"} />
              </div>
              <div className="absolute inset-x-0 bottom-0 p-6 pr-24">
                <p className="font-display text-3xl leading-none text-ivory">{heroName}</p>
                <p className="mt-1.5 text-sm text-champagne-soft/85">
                  {heroCategory} · {heroCity}
                </p>
              </div>
            </div>
            <div className="absolute -bottom-5 -right-3 rounded-full bg-card p-1.5 shadow-[0_12px_30px_-8px_rgba(0,0,0,0.55)] sm:-right-5">
              <TrustSeal score={featured?.trustScore ?? 98} size={104} />
            </div>
          </Link>
        </div>
      </section>

      {/* TRUST FEATURES - one espresso lead tile + two cream cards */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gold-ink">
            {t("trustEyebrow")}
          </p>
          <h2 className="mt-3 font-display text-4xl font-medium text-ink">
            {t("trustTitle")}
          </h2>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <div className="surface-dark relative overflow-hidden rounded-2xl bg-espresso p-8 md:col-span-2 md:p-10">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 [background:radial-gradient(40%_70%_at_90%_10%,color-mix(in_oklab,var(--champagne)_14%,transparent),transparent_65%)]"
            />
            <div className="relative md:max-w-2xl">
              <span className="grid size-12 place-items-center rounded-full border border-champagne/50 text-champagne">
                <lead.icon className="size-6" strokeWidth={1.6} />
              </span>
              <h3 className="mt-5 font-display text-2xl font-medium text-ivory md:text-3xl">
                {lead.title}
              </h3>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-ivory/65 md:text-base">
                {lead.desc}
              </p>
            </div>
          </div>
          {rest.map((f) => (
            <div
              key={f.title}
              className="flex flex-col rounded-2xl border border-line bg-card p-7 transition-shadow hover:shadow-[0_20px_50px_-30px_rgba(22,17,12,0.4)]"
            >
              <span className="grid size-12 place-items-center rounded-full border border-champagne/50 text-gold-ink">
                <f.icon className="size-6" strokeWidth={1.6} />
              </span>
              <h3 className="mt-5 font-display text-2xl font-medium text-ink">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS - serif numerals joined by hairlines, a genuine sequence */}
      <section className="bg-ivory-deep/50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-center font-display text-4xl font-medium text-ink">
            {t("stepsTitle")}
          </h2>
          <ol className="mt-14 grid gap-10 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="relative">
                <div className="flex items-center gap-5">
                  <span className="font-display text-5xl font-medium leading-none text-champagne">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {i < steps.length - 1 && (
                    <span aria-hidden className="hidden h-px flex-1 bg-champagne/35 md:block" />
                  )}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-ink">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {s.desc}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
