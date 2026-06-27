"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { setVerificationLevel, setProfileStatus } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";

export function SpecialistActions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const t = useTranslations("admin");
  const [pending, start] = useTransition();

  function run(fn: () => Promise<void>) {
    start(async () => {
      try {
        await fn();
        toast.success("OK");
      } catch {
        toast.error("Error");
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      <Button
        size="xs"
        variant="outline"
        disabled={pending}
        onClick={() => run(() => setVerificationLevel(id, "verified"))}
      >
        {t("makeVerified")}
      </Button>
      <Button
        size="xs"
        variant="outline"
        disabled={pending}
        onClick={() => run(() => setVerificationLevel(id, "premium_verified"))}
      >
        {t("makePremium")}
      </Button>
      {status === "active" ? (
        <Button
          size="xs"
          variant="outline"
          disabled={pending}
          onClick={() => run(() => setProfileStatus(id, "hidden"))}
        >
          {t("hide")}
        </Button>
      ) : (
        <Button
          size="xs"
          variant="outline"
          disabled={pending}
          onClick={() => run(() => setProfileStatus(id, "active"))}
        >
          {t("publish")}
        </Button>
      )}
    </div>
  );
}
