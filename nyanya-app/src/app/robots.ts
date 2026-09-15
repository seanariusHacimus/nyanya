import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

/**
 * /robots.txt. Закрыты кабинеты, админка и восстановление пароля — искать там
 * нечего, — а также /api/ и /_next/image: через них отдаются фотографии
 * специалистов, и лица частных людей не должны попадать в поиск по картинкам
 * (решение владельца). Страницы анкет /specialists/<slug> индексируются.
 *
 * Осторожно с префиксами: правило «Disallow: /specialist» закрыло бы и
 * /specialists/<slug>, то есть весь каталог анкет. Кабинет специалиста
 * закрывается тремя правилами — сам адрес ($ — конец адреса, его понимают
 * Google и Яндекс), вложенные страницы и адрес со строкой запроса
 * (/specialist?anketa=1).
 *
 * Файл статический: Next собирает его при сборке, адрес карты сайта берётся
 * из NEXT_PUBLIC_APP_URL.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/_next/image",
        "/admin",
        "/account",
        "/specialist$",
        "/specialist/",
        "/specialist?",
        "/reset-password",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
