"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { verifyPhoneMock, sendOtpMock } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function VerifyPhoneForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    sendOtpMock().catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    const res = await verifyPhoneMock(String(fd.get("code") ?? ""));
    setLoading(false);
    if (!res.ok) {
      toast.error(t("errorCode"));
      return;
    }
    toast.success(t("welcome"));
    router.push("/account");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="code">{t("code")}</Label>
        <Input
          id="code"
          name="code"
          inputMode="numeric"
          maxLength={6}
          required
          placeholder="••••••"
          className="text-center text-lg tracking-[0.5em]"
        />
        <p className="text-xs text-muted-foreground">{t("verifyHint")}</p>
      </div>
      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-royal text-primary-foreground hover:bg-royal-deep"
      >
        {t("verifyButton")}
      </Button>
      <button
        type="button"
        onClick={() => sendOtpMock().then(() => toast.success(t("codeSent")))}
        className="w-full text-center text-sm text-muted-foreground hover:text-royal"
      >
        {t("resend")}
      </button>
    </form>
  );
}
