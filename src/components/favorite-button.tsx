"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Heart } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { toggleFavorite } from "@/lib/actions/unlock";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FavoriteButton({
  specialistId,
  initial,
  authed,
}: {
  specialistId: string;
  initial: boolean;
  authed: boolean;
}) {
  const t = useTranslations("profile");
  const router = useRouter();
  const [fav, setFav] = useState(initial);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (!authed) {
      router.push("/login");
      return;
    }
    setLoading(true);
    const res = await toggleFavorite(specialistId);
    setLoading(false);
    if (res.ok) setFav(!!res.favorited);
  }

  return (
    <Button
      variant="outline"
      onClick={toggle}
      disabled={loading}
      className={cn("w-full", fav && "border-champagne text-gold-ink")}
    >
      <Heart className={cn("size-4", fav && "fill-champagne text-champagne")} />
      {fav ? t("favorited") : t("favorite")}
    </Button>
  );
}
