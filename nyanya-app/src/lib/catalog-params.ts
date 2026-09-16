import { categories, type CategoryKey } from "@/lib/specialists-shared";

/**
 * Контракт адреса каталога: разбор `?category=…&district=…&page=…` и обратная
 * сборка. Один модуль на обе стороны — страница разбирает, клиентский
 * компонент собирает, и разойтись они не могут.
 *
 * Состояние фильтров живёт в адресе, а не в памяти браузера: ссылку с
 * фильтрами можно переслать, «назад» возвращает прежнюю выборку, а перезагрузка
 * показывает ровно то же. Раньше состояние было только в `useState`, а каталог
 * приезжал в браузер целиком.
 *
 * Значения приходят от кого угодно, поэтому мусор молча превращается в
 * значение по умолчанию, а не в ошибку: `?page=abc` — это первая страница, а не
 * 400. Прецедент разбора — `lib/admin-params.ts`.
 *
 * Модуль клиент-безопасный: ни базы, ни zod (иначе zod уехал бы в браузер
 * вместе с компонентом каталога).
 */

/** Сколько карточек добавляет одно нажатие «Показать ещё». */
export const CATALOG_PAGE_SIZE = 9;
/**
 * Потолок накопительного показа. `page=N` отдаёт первые N×9 карточек, поэтому
 * без потолка `?page=100000` попросил бы у базы миллион строк.
 */
export const CATALOG_MAX_PAGE = 50;
export const CATALOG_MAX_CARDS = CATALOG_PAGE_SIZE * CATALOG_MAX_PAGE;

export const CATALOG_SORTS = {
  rating: "Премиум и оценки",
  price_asc: "Сначала дешевле",
  price_desc: "Сначала дороже",
  experience: "По опыту",
} as const;
export type CatalogSort = keyof typeof CATALOG_SORTS;

/**
 * Языки фильтра. Справа — ровно те строки, что лежат в
 * `specialist_profiles.languages` (их пишет анкета и редактор админки).
 */
export const CATALOG_LANGS = {
  ru: "Русский",
  uz: "Узбекский",
  en: "Английский",
} as const;
export type CatalogLang = keyof typeof CATALOG_LANGS;

export const CATALOG_TOGGLES = [
  { key: "premium", label: "Только премиум-профили" },
  { key: "english", label: "Знание английского" },
  { key: "car", label: "Наличие автомобиля" },
  { key: "livein", label: "С проживанием" },
  { key: "night", label: "Ночная няня" },
  { key: "newborn", label: "Для новорождённых" },
] as const;
export type CatalogToggle = (typeof CATALOG_TOGGLES)[number]["key"];

export type CatalogQuery = {
  category?: CategoryKey;
  /** Латинский токен района из `districts.name_en`: chilanzar, mirzo-ulugbek… */
  district?: string;
  lang?: CatalogLang;
  /** «Цена до», сум. Сравнение с сырой суммой — как было в браузере. */
  price?: number;
  /** «Опыт от», лет. */
  exp?: number;
  premium: boolean;
  english: boolean;
  car: boolean;
  livein: boolean;
  night: boolean;
  newborn: boolean;
  sort: CatalogSort;
  page: number;
};

export type CatalogSearchParams = Record<string, string | string[] | undefined>;

/** Повторённый параметр (`?page=2&page=9`) — берём первый. */
function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/**
 * Свой ли это ключ справочника.
 *
 * Именно `Object.hasOwn`, а не `key in obj`: `in` идёт по прототипу, поэтому
 * `?category=toString` и `?lang=constructor` считались бы допустимыми. Дальше
 * `toString` уезжал в SQL как значение перечисления и каталог отвечал пустой
 * страницей с ошибкой в логе, а из `CATALOG_LANGS` приходила функция.
 */
function known<T extends object>(
  dictionary: T,
  key: string
): key is string & keyof T {
  return Object.hasOwn(dictionary, key);
}

/**
 * Целое из адреса. Пустое поле («Цена до» очистили) и мусор — это «фильтра
 * нет»; ноль допустим, потому что в браузере «0» тоже был фильтром.
 */
function parseCount(raw: string, max: number): number | undefined {
  const value = raw.trim();
  if (!/^\d{1,9}$/.test(value)) return undefined;
  return Math.min(Number.parseInt(value, 10), max);
}

export function parseCatalogQuery(sp: CatalogSearchParams): CatalogQuery {
  const category = first(sp.category);
  const district = first(sp.district);
  const lang = first(sp.lang);
  const sort = first(sp.sort);
  const page = parseCount(first(sp.page), CATALOG_MAX_PAGE);
  const flag = (key: CatalogToggle) => first(sp[key]) === "1";

  return {
    category: known(categories, category) ? category : undefined,
    // Токен района — латиница, цифры и дефис; неизвестный токен значит «все
    // районы». Форма токена задаётся в `getCatalogDistricts` и обязана сюда
    // проходить, иначе фильтр молча перестанет работать — цифры разрешены
    // ради запасного `rayon-<id>` для района с непригодным `name_en`.
    district: /^[a-z0-9-]{2,32}$/.test(district) ? district : undefined,
    lang: known(CATALOG_LANGS, lang) ? lang : undefined,
    price: parseCount(first(sp.price), 999_999_999),
    exp: parseCount(first(sp.exp), 100),
    premium: flag("premium"),
    english: flag("english"),
    car: flag("car"),
    livein: flag("livein"),
    night: flag("night"),
    newborn: flag("newborn"),
    sort: known(CATALOG_SORTS, sort) ? sort : "rating",
    page: page && page >= 1 ? page : 1,
  };
}

/**
 * Обратная сборка. Пишутся только не-дефолтные ключи: чистый `/catalog`
 * остаётся чистым, а порядок ключей фиксирован, чтобы один и тот же экран
 * всегда давал один и тот же адрес.
 */
export function catalogQueryString(query: CatalogQuery): string {
  const params = new URLSearchParams();
  if (query.category) params.set("category", query.category);
  if (query.district) params.set("district", query.district);
  if (query.lang) params.set("lang", query.lang);
  if (query.price !== undefined) params.set("price", String(query.price));
  if (query.exp !== undefined) params.set("exp", String(query.exp));
  for (const toggle of CATALOG_TOGGLES) {
    if (query[toggle.key]) params.set(toggle.key, "1");
  }
  if (query.sort !== "rating") params.set("sort", query.sort);
  if (query.page > 1) params.set("page", String(query.page));
  return params.toString();
}

/** Есть ли хоть один фильтр. Сортировка и страница фильтрами не считаются. */
export function catalogHasFilters(query: CatalogQuery): boolean {
  return Boolean(
    query.category ||
      query.district ||
      query.lang ||
      query.price !== undefined ||
      query.exp !== undefined ||
      CATALOG_TOGGLES.some((toggle) => query[toggle.key])
  );
}
