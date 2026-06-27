import Image from "next/image";
import { useTranslations } from "next-intl";
import { ShieldCheck, Gauge, MessageCircle } from "lucide-react";
import { CategoryChooser } from "@/components/category-chooser";
import { TrustSeal } from "@/components/trust-seal";

export default function HomePage() {
  const t = useTranslations("home");
  const c = useTranslations("categories");
  const common = useTranslations("common");

  const features = [
    { icon: ShieldCheck, title: t("feature1Title"), desc: t("feature1Desc") },
    { icon: Gauge, title: t("feature2Title"), desc: t("feature2Desc") },
    { icon: MessageCircle, title: t("feature3Title"), desc: t("feature3Desc") },
  ];

  const steps = [
    { title: t("step1Title"), desc: t("step1Desc") },
    { title: t("step2Title"), desc: t("step2Desc") },
    { title: t("step3Title"), desc: t("step3Desc") },
  ];

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(60%_50%_at_85%_15%,color-mix(in_oklab,var(--champagne)_22%,transparent),transparent_60%),radial-gradient(45%_45%_at_5%_90%,color-mix(in_oklab,var(--royal)_14%,transparent),transparent_55%)]"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gold-ink">
              {t("heroEyebrow")}
            </p>
            <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.04] tracking-tight text-ink sm:text-6xl">
              {t("heroTitle")}
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
              {t("heroSub")}
            </p>

            <div className="mt-9">
              <p className="mb-3 text-sm font-medium text-ink/70">{t("chooseCategory")}</p>
              <CategoryChooser />
            </div>
          </div>

          {/* Visual: a premium specialist preview. Generated portrait drops in here later. */}
          <div className="relative mx-auto w-full max-w-md lg:mr-0">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[1.4rem] border border-line shadow-[0_40px_80px_-30px_rgba(44,26,79,0.55)]">
              <Image
                src="/media/hero.png"
                alt=""
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 460px"
                className="object-cover object-top"
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-royal-deep/80 via-royal-deep/10 to-transparent"
              />
              <div className="absolute left-5 top-5">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-champagne/40 bg-royal/85 px-2.5 py-1 text-xs font-medium text-champagne-soft backdrop-blur">
                  <ShieldCheck className="size-3.5" />
                  {common("premiumVerified")}
                </span>
              </div>
              <div className="absolute inset-x-0 bottom-0 p-6">
                <p className="font-display text-3xl leading-none text-ivory">Dilnoza R.</p>
                <p className="mt-1.5 text-sm text-champagne-soft/85">
                  {c("nanny")} · Toshkent
                </p>
              </div>
            </div>
            <div className="absolute -bottom-5 -right-3 rounded-full bg-card p-1.5 shadow-[0_12px_30px_-8px_rgba(44,26,79,0.4)] sm:-right-5">
              <TrustSeal score={98} size={104} />
            </div>
          </div>
        </div>
      </section>

      {/* TRUST FEATURES */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rule-gold mx-auto mb-12 max-w-xs" />
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gold-ink">
            {t("trustEyebrow")}
          </p>
          <h2 className="mt-3 font-display text-4xl font-semibold text-ink">
            {t("trustTitle")}
          </h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-line bg-card p-7 transition-shadow hover:shadow-[0_20px_50px_-30px_rgba(44,26,79,0.4)]"
            >
              <span className="grid size-12 place-items-center rounded-xl bg-royal/5 text-royal">
                <f.icon className="size-6" strokeWidth={1.6} />
              </span>
              <h3 className="mt-5 font-display text-2xl font-semibold text-ink">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS — a genuine sequence, so numbered */}
      <section className="bg-ivory-deep/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-center font-display text-4xl font-semibold text-ink">
            {t("stepsTitle")}
          </h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="relative">
                <span className="font-display text-5xl font-semibold text-champagne/70">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 text-xl font-semibold text-ink">{s.title}</h3>
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
