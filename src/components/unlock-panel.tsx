"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Phone, Send, MessageCircle, Lock } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { unlockContact } from "@/lib/actions/unlock";
import { Button } from "@/components/ui/button";

export function UnlockPanel({
  specialistId,
  priceLabel,
  unlocked,
  authed,
  phone,
}: {
  specialistId: string;
  priceLabel: string;
  unlocked: boolean;
  authed: boolean;
  phone: string | null;
}) {
  const t = useTranslations("profile");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (unlocked) {
    const digits = (phone ?? "").replace(/[^0-9]/g, "");
    return (
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wider text-gold-ink">{t("contacts")}</p>
        <a
          href={`tel:${digits}`}
          className="flex items-center gap-3 rounded-lg border border-line bg-card px-4 py-3 transition-colors hover:border-champagne"
        >
          <Phone className="size-4 text-gold-ink" />
          <span className="font-medium text-ink">{phone}</span>
        </a>
        <div className="grid grid-cols-2 gap-2">
          <a
            href={`https://t.me/+${digits}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-lg border border-line bg-card py-2.5 text-sm transition-colors hover:border-champagne"
          >
            <Send className="size-4 text-gold-ink" />
            {t("telegram")}
          </a>
          <a
            href={`https://wa.me/${digits}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-lg border border-line bg-card py-2.5 text-sm transition-colors hover:border-champagne"
          >
            <MessageCircle className="size-4 text-gold-ink" />
            {t("whatsapp")}
          </a>
        </div>
      </div>
    );
  }

  async function handleUnlock() {
    if (!authed) {
      router.push("/login");
      return;
    }
    setLoading(true);
    const res = await unlockContact(specialistId);
    setLoading(false);
    if (res.ok) {
      toast.success(t("unlockSuccess"));
      router.refresh();
    } else if (res.reason === "auth") {
      router.push("/login");
    } else {
      toast.error(t("unlockError"));
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-lg border border-dashed border-line bg-ivory-deep/40 p-3 text-sm text-muted-foreground">
        <Lock className="mt-0.5 size-4 shrink-0 text-champagne" />
        <span>{t("contactsLockedHint")}</span>
      </div>
      <Button
        onClick={handleUnlock}
        disabled={loading}
        className="w-full hover:bg-champagne-deep"
      >
        {authed ? t("openContacts", { price: priceLabel }) : t("loginToUnlock")}
      </Button>
    </div>
  );
}
