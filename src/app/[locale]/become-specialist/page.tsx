import { useTranslations } from "next-intl";
import { ShieldCheck, Gauge, MessageCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function BecomeSpecialistPage() {
  const t = useTranslations("home");
  const nav = useTranslations("nav");

  const features = [
    { icon: ShieldCheck, title: t("feature1Title"), desc: t("feature1Desc") },
    { icon: Gauge, title: t("feature2Title"), desc: t("feature2Desc") },
    { icon: MessageCircle, title: t("feature3Title"), desc: t("feature3Desc") },
  ];

  return (
    <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.28em] text-gold-ink">{nav("forSpecialists")}</p>
        <h1 className="mt-4 font-display text-5xl font-semibold text-ink">{t("ctaBecome")}</h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">{t("heroSub")}</p>
        <div className="mt-8">
          <Link
            href="/specialist"
            className={cn(buttonVariants(), "bg-royal text-primary-foreground hover:bg-royal-deep")}
          >
            {t("ctaBecome")}
          </Link>
        </div>
      </div>
      <div className="mt-16 grid gap-6 sm:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="rounded-2xl border border-line bg-card p-6">
            <span className="grid size-11 place-items-center rounded-xl bg-royal/5 text-royal">
              <f.icon className="size-5" strokeWidth={1.6} />
            </span>
            <h3 className="mt-4 font-display text-xl font-semibold text-ink">{f.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
