import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BrandMark } from "@/components/brand-mark";

export function SiteFooter() {
  const t = useTranslations("footer");
  const nav = useTranslations("nav");

  return (
    <footer className="surface-dark bg-espresso text-ivory/70">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <BrandMark onDark />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ivory/55">
              {t("tagline")}
            </p>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-champagne/85">
              {t("product")}
            </h4>
            <ul className="mt-4 space-y-2 text-sm text-ivory/65">
              <li>
                <Link href="/catalog" className="transition-colors hover:text-champagne">
                  {nav("catalog")}
                </Link>
              </li>
              <li>
                <Link href="/become-specialist" className="transition-colors hover:text-champagne">
                  {nav("forSpecialists")}
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="transition-colors hover:text-champagne">
                  {nav("howItWorks")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-champagne/85">
              {t("legal")}
            </h4>
            <ul className="mt-4 space-y-2 text-sm text-ivory/65">
              <li>
                <Link href="/terms" className="transition-colors hover:text-champagne">
                  {t("terms")}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="transition-colors hover:text-champagne">
                  {t("privacy")}
                </Link>
              </li>
              <li>
                <Link href="/about" className="transition-colors hover:text-champagne">
                  {t("about")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 rounded-lg border border-ivory/10 bg-ivory/[0.04] p-4">
          <p className="text-xs leading-relaxed text-ivory/55">
            <span className="font-semibold text-champagne/90">{t("disclaimerTitle")}. </span>
            {t("disclaimer")}
          </p>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-ivory/10 pt-6 text-xs text-ivory/45 sm:flex-row">
          <span>© 2026 nyanya.uz · {t("rights")}</span>
          <span>{t("location")}</span>
        </div>
      </div>
    </footer>
  );
}
