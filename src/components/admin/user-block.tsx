"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toggleBlockUser } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";

export function UserBlock({ id, banned }: { id: string; banned: boolean }) {
  const t = useTranslations("admin");
  const [pending, start] = useTransition();

  return (
    <Button
      size="xs"
      variant={banned ? "outline" : "destructive"}
      disabled={pending}
      onClick={() => start(() => toggleBlockUser(id, !banned))}
    >
      {banned ? t("unblock") : t("block")}
    </Button>
  );
}
