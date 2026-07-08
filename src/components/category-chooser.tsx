import { useTranslations } from "next-intl";
import { Baby, HeartHandshake, GraduationCap, Car } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { CATEGORIES, type Category } from "@/lib/constants";

const ICONS: Record<Category, typeof Baby> = {
  nanny: Baby,
  caregiver: HeartHandshake,
  tutor: GraduationCap,
  driver: Car,
};

/*
 * Styled with semantic tokens only, so the tiles adapt to the surface they sit
 * on: subtle espresso tiles inside the dark hero, warm-white cards on cream.
 */
export function CategoryChooser() {
  const t = useTranslations("categories");

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {CATEGORIES.map((c) => {
        const Icon = ICONS[c];
        return (
          <Link
            key={c}
            href={{ pathname: "/catalog", query: { category: c } }}
            className="group flex flex-col items-start gap-3 rounded-xl border border-line bg-card p-4 transition-all hover:border-champagne hover:shadow-[0_8px_30px_-12px_rgba(22,17,12,0.35)]"
          >
            <span className="grid size-10 place-items-center rounded-lg bg-champagne/12 text-champagne transition-colors group-hover:bg-champagne group-hover:text-espresso-deep">
              <Icon className="size-5" />
            </span>
            <span className="font-medium text-card-foreground">{t(c)}</span>
            <span className="text-xs text-muted-foreground">{t(`${c}_find`)}</span>
          </Link>
        );
      })}
    </div>
  );
}
