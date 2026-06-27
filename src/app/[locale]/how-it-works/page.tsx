import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function HowItWorksPage() {
  const t = useTranslations("home");

  const steps = [
    { title: t("step1Title"), desc: t("step1Desc") },
    { title: t("step2Title"), desc: t("step2Desc") },
    { title: t("step3Title"), desc: t("step3Desc") },
  ];

  return (
    <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
      <h1 className="text-center font-display text-5xl font-semibold text-ink">{t("stepsTitle")}</h1>
      <ol className="mt-14 grid gap-10 md:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title}>
            <span className="font-display text-5xl font-semibold text-champagne/70">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3 className="mt-3 text-xl font-semibold text-ink">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
          </li>
        ))}
      </ol>
      <div className="mt-14 text-center">
        <Link
          href="/catalog"
          className={cn(buttonVariants(), "bg-royal text-primary-foreground hover:bg-royal-deep")}
        >
          {t("browseCatalog")}
        </Link>
      </div>
    </section>
  );
}
