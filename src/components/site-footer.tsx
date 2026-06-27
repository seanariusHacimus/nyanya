import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BrandMark } from "@/components/brand-mark";

export function SiteFooter() {
  const t = useTranslations("footer");
  const nav = useTranslations("nav");

  return (
    <footer className="border-t border-line bg-ivory-deep/40">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <BrandMark />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {t("tagline")}
            </p>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gold-ink">
              {t("product")}
            </h4>
            <ul className="mt-4 space-y-2 text-sm text-ink/70">
              <li>
                <Link href="/catalog" className="hover:text-royal">
                  {nav("catalog")}
                </Link>
              </li>
              <li>
                <Link href="/become-specialist" className="hover:text-royal">
                  {nav("forSpecialists")}
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-royal">
                  {nav("howItWorks")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gold-ink">
              {t("legal")}
            </h4>
            <ul className="mt-4 space-y-2 text-sm text-ink/70">
              <li>
                <Link href="/terms" className="hover:text-royal">
                  {t("terms")}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-royal">
                  {t("privacy")}
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-royal">
                  {t("about")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 rounded-lg border border-line bg-ivory/60 p-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-semibold text-gold-ink">{t("disclaimerTitle")}. </span>
            {t("disclaimer")}
          </p>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-line pt-6 text-xs text-muted-foreground sm:flex-row">
          <span>© 2026 NANYA.UZ — {t("rights")}</span>
          <span>{t("location")}</span>
        </div>
      </div>
    </footer>
  );
}
