"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "@phosphor-icons/react";
import {
  getSession,
  getFavorites,
  toggleFavorite,
  subscribeDemo,
} from "@/lib/demo";

/** D11 — ♡ на карточке: гость → /login, авторизованный — переключает избранное. */
export function FavoriteHeart({
  slug,
  name,
  className = "",
}: {
  slug: string;
  name: string;
  className?: string;
}) {
  const router = useRouter();
  const [active, setActive] = useState(false);

  useEffect(() => {
    const sync = () => setActive(getFavorites().includes(slug));
    sync();
    return subscribeDemo(sync);
  }, [slug]);

  return (
    <button
      type="button"
      onClick={() => {
        if (!getSession()) {
          router.push("/login");
          return;
        }
        setActive(toggleFavorite(slug));
      }}
      aria-label={
        active
          ? `Убрать ${name} из избранного`
          : `Добавить ${name} в избранное`
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
