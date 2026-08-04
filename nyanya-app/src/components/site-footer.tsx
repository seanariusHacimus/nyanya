import Link from "next/link";
import { footer } from "@/content/home";
import { ButtonLink } from "@/components/ui/button-link";

export function SiteFooter() {
  return (
    <footer className="bg-charcoal text-cream">
      <div className="mx-auto max-w-[1400px] px-5 pt-20 pb-10 sm:px-8">
        <div className="grid gap-14 md:grid-cols-3 lg:grid-cols-[1.4fr_repeat(3,1fr)_1.3fr] lg:gap-10">
          <div className="md:col-span-3 lg:col-span-1">
            <Link
              href="/"
              className="font-display text-xl font-semibold tracking-[0.08em] text-cream"
            >
              NYANYA.UZ
            </Link>
            <p className="mt-3 font-display text-2xl leading-snug font-medium text-bronze-soft">
              {footer.slogan}
            </p>
            <p className="mt-4 max-w-[26ch] text-sm leading-relaxed text-cream/60">
              {footer.tagline}
            </p>
          </div>

          {footer.columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h3 className="label-caps text-cream/60">{column.title}</h3>
              <ul className="mt-6 space-y-3.5">
                {column.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="inline-block py-0.5 text-sm text-cream/75 transition-colors duration-300 hover:text-cream"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="md:col-span-3 lg:col-span-1 lg:text-right">
            {/* Почта, мессенджеры и часы работы убраны по решению владельца:
                публичных контактов у площадки пока нет. Обращения принимает
                форма на странице «Контакты» */}
            <div className="lg:flex lg:justify-end">
              <ButtonLink href={footer.cta.href} variant="outline-light">
                {footer.cta.label}
              </ButtonLink>
            </div>
          </div>
        </div>

        <p className="mt-16 border-t border-cream/10 pt-8 text-center text-xs leading-relaxed text-cream/60">
          {footer.disclaimer}
        </p>
      </div>

      <div className="bg-charcoal-deep">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-3 px-5 py-6 text-xs text-cream/60 sm:px-8 lg:flex-row">
          <p>{footer.bottom.copyright}</p>
          <ul className="flex flex-wrap justify-center gap-x-8 gap-y-3">
            {footer.bottom.links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-block py-1 transition-colors duration-300 hover:text-cream"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <p>{footer.bottom.location}</p>
        </div>
      </div>
    </footer>
  );
}
