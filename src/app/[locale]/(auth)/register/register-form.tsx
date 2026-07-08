"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "@/i18n/navigation";
import { setSpecialistRole } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function RegisterForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [accountType, setAccountType] = useState<"parent" | "specialist">("parent");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await authClient.signUp.email({
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      password: String(fd.get("password") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      locale,
    });
    if (error) {
      setLoading(false);
      toast.error(error.message ?? t("errorGeneric"));
      return;
    }
    if (accountType === "specialist") {
      try {
        await setSpecialistRole();
      } catch {
        /* non-fatal: stays a parent, can be changed later */
      }
    }
    setLoading(false);
    router.push("/verify-phone");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-2">
        <Label>{t("accountType")}</Label>
        <div className="grid grid-cols-2 gap-2">
          {(["parent", "specialist"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setAccountType(type)}
              className={cn(
                "rounded-lg border p-3 text-left text-sm leading-snug transition-colors",
                accountType === type
                  ? "border-champagne bg-champagne/10 text-gold-ink"
                  : "border-line text-muted-foreground hover:border-champagne/60",
              )}
            >
              {type === "parent" ? t("asParent") : t("asSpecialist")}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="name">{t("name")}</Label>
        <Input id="name" name="name" required autoComplete="name" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="phone">{t("phone")}</Label>
        <Input id="phone" name="phone" type="tel" required placeholder="+998 90 123 45 67" autoComplete="tel" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">{t("password")}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      <Button
        type="submit"
        disabled={loading}
        className="w-full hover:bg-champagne-deep"
      >
        {t("submitRegister")}
      </Button>
    </form>
  );
}
