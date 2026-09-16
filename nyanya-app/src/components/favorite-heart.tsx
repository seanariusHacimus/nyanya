"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "@phosphor-icons/react";
import { toggleFavoriteAction } from "@/lib/actions/favorites";

/** D11 — ♡ на карточке и в профиле: гость → /login, вошедший — запись в БД. */
export function FavoriteHeart({
  slug,
  name,
  initialActive = false,
  authed = false,
  className = "",
}: {
  slug: string;
  name: string;
  initialActive?: boolean;
  authed?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [active, setActive] = useState(initialActive);
  const [, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => {
        if (!authed) {
          router.push(`/login?next=${encodeURIComponent(`/specialists/${slug}`)}`);
          return;
        }
        const next = !active;
        setActive(next); // оптимистично
        startTransition(async () => {
          const result = await toggleFavoriteAction({ slug });
          if (!result.ok) {
            setActive(!next);
            if (result.error === "unauthorized") router.push("/login");
          } else {
            setActive(result.active);
          }
        });
      }}
      aria-label={
        active ? `Убрать ${name} из избранного` : `Добавить ${name} в избранное`
      }
      aria-pressed={active}
      className={`flex size-11 items-center justify-center rounded-full bg-cream/95 transition-colors duration-300 ${
        active ? "text-bronze-text" : "text-ink hover:text-bronze-text"
      } ${className}`}
    >
      <Heart size={18} weight={active ? "fill" : "regular"} aria-hidden="true" />
    </button>
  );
}
