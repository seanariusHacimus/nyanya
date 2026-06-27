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
            className="group flex flex-col items-start gap-3 rounded-xl border border-line bg-card p-4 transition-all hover:border-champagne hover:shadow-[0_8px_30px_-12px_rgba(75,46,131,0.25)]"
          >
            <span className="grid size-10 place-items-center rounded-lg bg-royal/5 text-royal transition-colors group-hover:bg-royal group-hover:text-champagne">
              <Icon className="size-5" />
            </span>
            <span className="font-medium text-ink">{t(c)}</span>
            <span className="text-xs text-muted-foreground">{t(`${c}_find`)}</span>
          </Link>
        );
      })}
    </div>
  );
}
