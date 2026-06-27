import { BadgeCheck, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { VerificationLevel } from "@/lib/constants";

export function VerificationBadge({
  level,
  className,
}: {
  level: VerificationLevel;
  className?: string;
}) {
  const t = useTranslations("common");
  if (level === "unverified") return null;

  const premium = level === "premium_verified";
  const Icon = premium ? ShieldCheck : BadgeCheck;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        premium
          ? "border-champagne/60 bg-champagne-soft/50 text-gold-ink"
          : "border-royal/20 bg-royal/5 text-royal",
        className,
      )}
    >
      <Icon className="size-3.5" strokeWidth={2} />
      {premium ? t("premiumVerified") : t("verified")}
    </span>
  );
}
