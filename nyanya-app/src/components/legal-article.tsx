import Link from "next/link";

export type LegalSection = { title: string; paragraphs: string[] };

/**
 * §19 — правовые страницы: одноколоночный article-макет.
 * ⛳ Тексты — структурный черновик; финальную редакцию готовит юрист (РУз).
 */
export function LegalArticle({
  title,
  updated,
  sections,
  crossLink,
}: {
  title: string;
  updated: string;
  sections: LegalSection[];
  crossLink: { label: string; href: string };
}) {
  return (
    <main className="flex-1">
      <article className="mx-auto max-w-[840px] px-5 pt-14 pb-24 sm:px-8 lg:pt-20 lg:pb-32">
        <h1 className="font-display text-4xl leading-[1.1] font-medium tracking-[-0.01em] text-ink sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 text-sm text-ink-faint">Редакция от {updated}</p>

        <div className="mt-12 space-y-10">
          {sections.map((section, i) => (
            <section key={section.title}>
              <h2 className="font-display text-2xl font-medium text-ink">
                {i + 1}. {section.title}
              </h2>
              {section.paragraphs.map((p) => (
                <p key={p} className="mt-4 text-base leading-relaxed text-ink-soft">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>

        <p className="mt-14 border-t border-line pt-8 text-sm text-ink-soft">
          Смотрите также:{" "}
          <Link
            href={crossLink.href}
            className="border-b border-ink/30 pb-0.5 font-medium text-ink transition-colors duration-300 hover:border-bronze hover:text-bronze-text"
          >
            {crossLink.label}
          </Link>
        </p>
      </article>
    </main>
  );
}
