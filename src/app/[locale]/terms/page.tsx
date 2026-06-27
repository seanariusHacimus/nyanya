import { useTranslations } from "next-intl";

export default function TermsPage() {
  const t = useTranslations("footer");
  return (
    <section className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
      <h1 className="font-display text-4xl font-semibold text-ink">{t("terms")}</h1>
      <div className="mt-6 rounded-xl border border-line bg-card p-5">
        <p className="font-semibold text-gold-ink">{t("disclaimerTitle")}</p>
        <p className="mt-2 leading-relaxed text-muted-foreground">{t("disclaimer")}</p>
      </div>
    </section>
  );
}
