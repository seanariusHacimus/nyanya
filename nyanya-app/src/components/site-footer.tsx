import Link from "next/link";
import {
  InstagramLogo,
  TelegramLogo,
  Phone,
} from "@phosphor-icons/react/dist/ssr";
import { footer } from "@/content/home";
import { ButtonLink } from "@/components/ui/button-link";

const socialIcons = {
  instagram: InstagramLogo,
  telegram: TelegramLogo,
  phone: Phone,
} as const;

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
            <p className="mt-5 max-w-[26ch] text-sm leading-relaxed text-cream/60">
              {footer.tagline}
            </p>
            <ul className="mt-7 flex gap-3">
              {footer.social.map((item) => {
                const Icon = socialIcons[item.icon as keyof typeof socialIcons];
                return (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      aria-label={item.label}
                      target={item.href.startsWith("http") ? "_blank" : undefined}
                      rel={
                        item.href.startsWith("http")
                          ? "noopener noreferrer"
                          : undefined
                      }
                      className="flex size-11 items-center justify-center rounded-full border border-cream/20 text-cream/70 transition-colors duration-300 hover:border-cream/50 hover:text-cream"
                    >
                      <Icon size={18} />
                    </a>
                  </li>
                );
              })}
            </ul>
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
            <p>
              <a
                href={footer.phone.href}
                className="font-display text-2xl whitespace-nowrap text-cream transition-colors duration-300 hover:text-bronze-soft"
              >
                {footer.phone.label}
              </a>
            </p>
            <p className="mt-3">
              <a
                href={footer.email.href}
                className="inline-block py-1 text-sm text-cream/75 transition-colors duration-300 hover:text-cream"
              >
                {footer.email.label}
              </a>
            </p>
            <div className="mt-8 lg:flex lg:justify-end">
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
