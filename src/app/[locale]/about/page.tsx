import { useTranslations } from "next-intl";

export default function AboutPage() {
  const b = useTranslations("brand");
  const f = useTranslations("footer");
  return (
    <section className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
      <h1 className="font-display text-4xl font-semibold text-ink">{b("name")}</h1>
      <p className="mt-4 text-lg text-muted-foreground">{b("tagline")}</p>
      <p className="mt-4 leading-relaxed text-muted-foreground">{f("tagline")}</p>
    </section>
  );
}
