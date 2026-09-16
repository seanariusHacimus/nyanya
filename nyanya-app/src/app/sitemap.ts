import type { MetadataRoute } from "next";
import { posts } from "@/content/blog";
import { getSitemapSpecialists } from "@/lib/queries/specialists";
import { SITE_URL } from "@/lib/site-url";

/**
 * /sitemap.xml: публичные страницы, статьи блога и опубликованные анкеты —
 * те же, что в каталоге (активные, с адресом, не на паузе).
 *
 * Карта читает базу, поэтому строится на каждый запрос, как и страницы с
 * данными из PostgreSQL: без force-dynamic Next собрал бы её при `next build`,
 * где базы может не быть, и не обновлял бы до следующего деплоя.
 *
 * lastModified стоит только у анкет — это updated_at строки. У статических
 * страниц и статей честной даты правки нет, и выдумывать её не нужно.
 * Кабинеты, админка, вход, регистрация и восстановление пароля в карту не
 * входят.
 */
export const dynamic = "force-dynamic";

type Frequency = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;

const STATIC_PAGES: { path: string; priority: number; frequency: Frequency }[] = [
  { path: "/", priority: 1, frequency: "daily" },
  { path: "/catalog", priority: 0.9, frequency: "daily" },
  { path: "/become-specialist", priority: 0.7, frequency: "monthly" },
  { path: "/how-it-works", priority: 0.6, frequency: "monthly" },
  { path: "/verification", priority: 0.6, frequency: "monthly" },
  { path: "/about", priority: 0.5, frequency: "monthly" },
  { path: "/faq", priority: 0.5, frequency: "monthly" },
  { path: "/blog", priority: 0.5, frequency: "weekly" },
  { path: "/contacts", priority: 0.3, frequency: "yearly" },
  { path: "/terms", priority: 0.2, frequency: "yearly" },
  { path: "/privacy", priority: 0.2, frequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const specialists = await getSitemapSpecialists();

  return [
    ...STATIC_PAGES.map((page) => ({
      url: `${SITE_URL}${page.path}`,
      changeFrequency: page.frequency,
      priority: page.priority,
    })),
    ...posts.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    ...specialists.map((s) => ({
      url: `${SITE_URL}/specialists/${s.slug}`,
      lastModified: s.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
