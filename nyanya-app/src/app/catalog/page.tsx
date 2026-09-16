import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { CatalogView } from "@/components/catalog-view";
import {
  countActiveSpecialists,
  getCatalogPage,
  type CatalogFilters,
} from "@/lib/queries/specialists";
import { getCatalogDistricts } from "@/lib/queries/districts";
import { getFavoriteSlugs } from "@/lib/queries/account";
import {
  catalogHasFilters,
  parseCatalogQuery,
  type CatalogSearchParams,
} from "@/lib/catalog-params";
import { SITE_URL } from "@/lib/site-url";

export const dynamic = "force-dynamic"; // избранное зависит от сессии

const DESCRIPTION =
  "Проверенные няни, сиделки, помощники по хозяйству и водители в Ташкенте. Фильтры по району, цене и опыту, опыт работы и отзывы семей.";

/**
 * `canonical` у всех комбинаций фильтров один — `/catalog`: тысячи адресов
 * вида `?district=…&price=…&page=7` не должны попадать в индекс отдельными
 * страницами с почти одинаковым содержимым. Адрес абсолютный: `metadataBase`
 * в приложении не задан, а относительный canonical Next разрешил бы
 * относительно localhost.
 *
 * Заголовок вкладки намеренно НЕ зависит от выбранной категории, хотя
 * `searchParams` здесь доступны. В Next 16.3.5 при переходе внутри того же
 * маршрута (меняется только строка запроса) заголовок в браузере не
 * обновляется: проверено локально 2026-09-16 — после смены категории
 * селектом и даже по ссылке из шапки `document.title` оставался от прежнего
 * адреса, а один раз показал вообще третью категорию (из предзагруженного
 * маршрута). Вкладка «Няни в Ташкенте» над списком водителей — ровно та
 * рассинхронизация, которой в интерфейсе быть не должно; название категории
 * человек видит в H1, который считается на сервере и всегда верен.
 */
export async function generateMetadata() {
  return {
    title: "Каталог специалистов",
    description: DESCRIPTION,
    alternates: { canonical: `${SITE_URL}/catalog` },
  };
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>;
}) {
  const query = parseCatalogQuery(await searchParams);

  const [session, districtList] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getCatalogDistricts(),
  ]);

  // неизвестный токен района (`?district=mars`) молча значит «все районы»
  const district = districtList.find((d) => d.token === query.district);
  // поля перечислены по одному: в SQL уезжает district_id, а не токен из
  // адреса, и форма этого объекта — ключ кэша выдачи
  const filters: CatalogFilters = {
    category: query.category,
    districtId: district?.id,
    lang: query.lang,
    price: query.price,
    exp: query.exp,
    premium: query.premium,
    english: query.english,
    car: query.car,
    livein: query.livein,
    night: query.night,
    newborn: query.newborn,
    sort: query.sort,
    page: query.page,
  };

  const [page, favoriteSlugs] = await Promise.all([
    getCatalogPage(filters),
    session ? getFavoriteSlugs(session.user.id) : Promise.resolve([]),
  ]);

  // Пустой каталог и пустая выборка — разные вещи (разные тексты и разные
  // кнопки), поэтому лишний счётчик спрашиваем только когда он что-то решает.
  const catalogEmpty =
    page.total > 0
      ? false
      : catalogHasFilters(query)
        ? (await countActiveSpecialists()) === 0
        : true;

  return (
    <main className="flex-1">
      <CatalogView
        query={query}
        items={page.items}
        total={page.total}
        catalogEmpty={catalogEmpty}
        districts={districtList}
        favoriteSlugs={favoriteSlugs}
        authed={Boolean(session)}
      />
    </main>
  );
}
