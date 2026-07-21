"use client";

import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export function LogoutButton({ className }: { className?: string }) {
  const t = useTranslations("nav");
  const router = useRouter();
  return (
    <Button
      variant="outline"
      className={className}
      onClick={async () => {
        await authClient.signOut();
        router.push("/");
        router.refresh();
      }}
    >
      {t("logout")}
    </Button>
  );
}
