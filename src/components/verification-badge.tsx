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
          ? "border-transparent bg-gold-ink text-white shadow-sm"
          : "border-transparent bg-royal text-white shadow-sm",
        className,
      )}
    >
      <Icon className="size-3.5" strokeWidth={2} />
      {premium ? t("premiumVerified") : t("verified")}
    </span>
  );
}
