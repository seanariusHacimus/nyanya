import {
  and,
  arrayContains,
  asc,
  count,
  desc,
  eq,
  gte,
  isNotNull,
  lte,
  ne,
  type SQL,
} from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import {
  specialistProfiles,
  districts,
  reviews,
  user,
} from "@/db/schema";
import {
  CATALOG_LANGS,
  CATALOG_PAGE_SIZE,
  type CatalogLang,
  type CatalogSort,
} from "@/lib/catalog-params";
import { CATALOG_TAG } from "@/lib/catalog-cache";

/**
 * Чтение анкет из PostgreSQL для публичных страниц.
 * Формы данных — плоские и сериализуемые (уходят в клиентские компоненты).
 */

import {
  categories,
  formatPrice,
  buildContacts,
  type CategoryKey,
  type UiSpecialist,
  type UiReview,
  type SpecialistContacts,
  PRICE_UNIT_LABEL,
} from "@/lib/specialists-shared";
import { contactUnlocks } from "@/db/schema";

/** Контакты специалиста для уже открывшего их пользователя (иначе null). */
export async function getUnlockedContactsForUser(
  slug: string,
  userId: string
): Promise<SpecialistContacts | null> {
  const rows = await db
    .select({ phone: user.phone })
    .from(contactUnlocks)
    .innerJoin(
      specialistProfiles,
      eq(specialistProfiles.id, contactUnlocks.specialistId)
    )
    .innerJoin(user, eq(user.id, specialistProfiles.userId))
    .where(
      and(
        eq(contactUnlocks.parentId, userId),
        eq(specialistProfiles.slug, slug)
      )
    )
    .limit(1);
  const phone = rows[0]?.phone;
  return phone ? buildContacts(phone) : null;
}

export { categories, formatPrice };
export type { CategoryKey, UiSpecialist, UiReview };

const englishLabels = { none: "Нет", basic: "Базовый", fluent: "Свободный" } as const;

function age(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const born = new Date(birthDate);
  const now = new Date();
  let years = now.getFullYear() - born.getFullYear();
  const beforeBirthday =
    now.getMonth() < born.getMonth() ||
    (now.getMonth() === born.getMonth() && now.getDate() < born.getDate());
  if (beforeBirthday) years -= 1;
  return years;
}

type Row = typeof specialistProfiles.$inferSelect & { districtName: string | null };

function toUi(row: Row): UiSpecialist {
  const attributes: string[] = [];
  if (row.hasCar) attributes.push("Свой автомобиль");
  if (row.liveIn) attributes.push("С проживанием");
  if (row.nightAvailable) attributes.push("Ночные смены");
  if (row.newbornExp) attributes.push("Опыт с новорождёнными");

  return {
    slug: row.slug ?? row.id,
    name: row.fullName,
    age: age(row.birthDate),
    gender: row.gender,
    category: row.category as CategoryKey,
    district: row.districtName ?? "Ташкент",
    experienceYears: row.experienceYears,
    rating: Number(row.ratingAvg),
    reviewCount: row.reviewCount,
    priceFrom: row.priceAmount,
    // «месяц» раньше проваливался в «час»: тройку значений разбирала
    // двоичная проверка, и анкета с месячной оплатой показывала «сум/час»
    priceUnit: PRICE_UNIT_LABEL[row.priceUnit],
    // «Премиум» = документы проверил администратор. Всё остальное —
    // опубликованная анкета без проверки документов; называть её
    // «проверенной» значит обещать семье то, чего не было.
    verification:
      row.verificationLevel === "premium_verified"
        ? "premium"
        : row.verificationLevel === "verified"
          ? "published"
          : null,
    available: !row.employed,
    languages: row.languages ?? [],
    english: englishLabels[row.englishLevel] ?? "Нет",
    education: row.education ?? "",
    attributes,
    extraOffer: row.extraOffer ?? "",
    about: (row.description ?? "").split("\n\n").filter(Boolean),
    photoUrl: row.photoKey,
  };
}

const activeWithSlug = and(
  eq(specialistProfiles.status, "active"),
  isNotNull(specialistProfiles.slug)
);

/**
 * Что показывать в списках.
 *
 * Кроме опубликованных отсеиваем тех, кто сам отметил «сейчас не ищу работу»:
 * показывать семье человека, который заведомо не ответит, — впустую потратить
 * её время и подорвать доверие к каталогу.
 *
 * Отдельная колонка `employed`, а не статус `hidden`: скрытие статусом —
 * инструмент модератора, и специалист не должен уметь отменять его решение,
 * переключая тумблер у себя в кабинете.
 */
const listedInCatalog = and(activeWithSlug, eq(specialistProfiles.employed, false));

/**
 * Порядок каталога по умолчанию — один на все списки.
 *
 * Премиум выше стандартного — обещание с плашки в кабинете (PREMIUM_BENEFITS);
 * перечисление enum упорядочено так, что premium_verified старше остальных.
 * Дальше — оценка семей, число отзывов и свежесть публикации.
 *
 * Хвост по `id` обязателен: при равных оценках Postgres вправе вернуть строки
 * в любом порядке, и накопительные страницы (`page=1` — первые 9, `page=2` —
 * первые 18) могли бы потерять или задвоить карточку между запросами.
 */
const CATALOG_ORDER = [
  desc(specialistProfiles.verificationLevel),
  desc(specialistProfiles.ratingAvg),
  desc(specialistProfiles.reviewCount),
  desc(specialistProfiles.publishedAt),
  asc(specialistProfiles.id),
];

function orderFor(sort: CatalogSort) {
  switch (sort) {
    case "price_asc":
      return [asc(specialistProfiles.priceAmount), ...CATALOG_ORDER];
    case "price_desc":
      return [desc(specialistProfiles.priceAmount), ...CATALOG_ORDER];
    case "experience":
      return [desc(specialistProfiles.experienceYears), ...CATALOG_ORDER];
    default:
      return CATALOG_ORDER;
  }
}

/**
 * Фильтры каталога в том виде, в каком их понимает SQL: район уже найден по
 * латинскому токену из адреса и превращён в `district_id`.
 */
export type CatalogFilters = {
  category?: CategoryKey;
  districtId?: number;
  lang?: CatalogLang;
  price?: number;
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

/**
 * Те же правила отбора, что раньше работали в браузере, — слово в слово.
 *
 * «Цена до» намеренно сравнивает сырую сумму, не приводя её к единице оплаты:
 * так было и так написано подсказкой под полем («Няни и водители — сум/час,
 * сиделки — сум/день»). Разделять фильтр по единицам — отдельное решение.
 */
function catalogWhere(filters: CatalogFilters): SQL {
  const parts: SQL[] = [listedInCatalog!];
  if (filters.category)
    parts.push(eq(specialistProfiles.category, filters.category));
  if (filters.districtId)
    parts.push(eq(specialistProfiles.districtId, filters.districtId));
  if (filters.lang)
    parts.push(
      arrayContains(specialistProfiles.languages, [CATALOG_LANGS[filters.lang]])
    );
  if (filters.price !== undefined)
    parts.push(lte(specialistProfiles.priceAmount, filters.price));
  if (filters.exp !== undefined)
    parts.push(gte(specialistProfiles.experienceYears, filters.exp));
  if (filters.premium)
    parts.push(eq(specialistProfiles.verificationLevel, "premium_verified"));
  if (filters.english) parts.push(ne(specialistProfiles.englishLevel, "none"));
  if (filters.car) parts.push(eq(specialistProfiles.hasCar, true));
  if (filters.livein) parts.push(eq(specialistProfiles.liveIn, true));
  if (filters.night) parts.push(eq(specialistProfiles.nightAvailable, true));
  if (filters.newborn) parts.push(eq(specialistProfiles.newbornExp, true));
  return and(...parts)!;
}

export type CatalogPage = { items: UiSpecialist[]; total: number };

/**
 * Страница каталога и честное «Найдено» — двумя запросами сразу.
 *
 * Смещение не нужно: «Показать ещё» накопительное, `page=N` показывает первые
 * N×9 карточек от начала, поэтому ссылку с `page=3` можно переслать и она
 * покажет ровно те же 27 карточек. При потолке в 450 строк Postgres читает по
 * индексу ровно `limit` строк — курсор по составному ключу из пяти колонок
 * усложнил бы код без выигрыша.
 */
async function queryCatalogPage(filters: CatalogFilters): Promise<CatalogPage> {
  const where = catalogWhere(filters);
  const [rows, totals] = await Promise.all([
    db
      .select({ profile: specialistProfiles, districtName: districts.nameRu })
      .from(specialistProfiles)
      .leftJoin(districts, eq(districts.id, specialistProfiles.districtId))
      .where(where)
      .orderBy(...orderFor(filters.sort))
      .limit(filters.page * CATALOG_PAGE_SIZE),
    db.select({ n: count() }).from(specialistProfiles).where(where),
  ]);
  return {
    items: rows.map((r) => toUi({ ...r.profile, districtName: r.districtName })),
    total: totals[0]?.n ?? 0,
  };
}

async function queryCountActiveSpecialists(): Promise<number> {
  const rows = await db
    .select({ n: count() })
    .from(specialistProfiles)
    .where(listedInCatalog);
  return rows[0]?.n ?? 0;
}

async function queryFeaturedSpecialist(): Promise<UiSpecialist | null> {
  const rows = await db
    .select({ profile: specialistProfiles, districtName: districts.nameRu })
    .from(specialistProfiles)
    .leftJoin(districts, eq(districts.id, specialistProfiles.districtId))
    .where(listedInCatalog)
    .orderBy(...CATALOG_ORDER)
    .limit(1);
  const row = rows[0];
  return row ? toUi({ ...row.profile, districtName: row.districtName }) : null;
}

/**
 * Кэш выдачи на 60 секунд с тегом. Ключ — аргументы, то есть по записи на
 * комбинацию фильтров; сессия и избранное сюда не попадают (их читает
 * страница отдельно), поэтому кэш общий и безопасный.
 *
 * Любое действие, меняющее анкеты, зовёт `revalidateCatalog()` и сбрасывает
 * тег немедленно. Правки базы мимо действий (скрипты, ручной SQL) каталог
 * увидит с задержкой до 60 секунд — это цена кэша.
 *
 * Почему `unstable_cache`, а не директива `use cache`: в Next 16.3.5 `use
 * cache` и `cacheTag` работают только при `cacheComponents: true`
 * (node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache.md),
 * а этот флаг переводит всё приложение на другую модель рендеринга. Это
 * отдельная работа, не эта.
 */
const cacheOptions = { tags: [CATALOG_TAG], revalidate: 60 };

const cachedCatalogPage = unstable_cache(
  (page: number) => queryCatalogPage({ ...DEFAULT_FILTERS, page }),
  ["catalog-page"],
  cacheOptions
);

/**
 * Кэшируется только вид БЕЗ фильтров — тот, на который приходит большинство.
 *
 * `unstable_cache` делает запись на каждый набор аргументов и кладёт её файлом
 * на диск. Ключ отфильтрованной выдачи включает «Цену до» (почти миллиард
 * значений) и «Опыт от», а у каталога нет ограничения частоты: перебор
 * параметров в адресе набивал бы диск единственного контейнера файлами по
 * 4 КБ (проверено локально: 60 разных цен — 62 файла). Здесь ключ — только
 * номер страницы, значит записей не больше CATALOG_MAX_PAGE.
 *
 * Отфильтрованный запрос идёт прямо в базу. Цена невелика: при 10 000 анкет
 * замер дал 11 мс без кэша против 6 мс с попаданием — на фоне дороги до
 * Сингапура это незаметно, а индексы из 0015 держат запрос на уровне
 * миллисекунд.
 */
export function getCatalogPage(filters: CatalogFilters): Promise<CatalogPage> {
  return isDefaultCatalogView(filters)
    ? cachedCatalogPage(filters.page)
    : queryCatalogPage(filters);
}

const DEFAULT_FILTERS: Omit<CatalogFilters, "page"> = {
  category: undefined,
  districtId: undefined,
  lang: undefined,
  price: undefined,
  exp: undefined,
  premium: false,
  english: false,
  car: false,
  livein: false,
  night: false,
  newborn: false,
  sort: "rating",
};

/** Ни одного сужения: ровно то, что видит человек, открывший /catalog. */
function isDefaultCatalogView(f: CatalogFilters): boolean {
  return (
    f.category === undefined &&
    f.districtId === undefined &&
    f.lang === undefined &&
    f.price === undefined &&
    f.exp === undefined &&
    !f.premium &&
    !f.english &&
    !f.car &&
    !f.livein &&
    !f.night &&
    !f.newborn &&
    f.sort === "rating"
  );
}

/** Сколько анкет в каталоге — для «анкет в каталоге» на /about и пустого состояния. */
export const countActiveSpecialists = unstable_cache(
  queryCountActiveSpecialists,
  ["catalog-count"],
  cacheOptions
);

/** Одна витринная анкета для /become-specialist — первая по CATALOG_ORDER. */
export const getFeaturedSpecialist = unstable_cache(
  queryFeaturedSpecialist,
  ["catalog-featured"],
  cacheOptions
);

/**
 * Адреса анкет для sitemap.xml — ровно те анкеты, что видны в каталоге
 * (listedInCatalog). Поставленные на паузу открываются по прямой ссылке, но
 * роботам их не предлагаем, как и семьям в каталоге.
 */
export async function getSitemapSpecialists(): Promise<
  { slug: string; updatedAt: Date }[]
> {
  const rows = await db
    .select({
      slug: specialistProfiles.slug,
      updatedAt: specialistProfiles.updatedAt,
    })
    .from(specialistProfiles)
    .where(listedInCatalog)
    .orderBy(desc(specialistProfiles.publishedAt));
  // slug не null по условию выборки; проверка — для типа
  return rows.flatMap((r) =>
    r.slug ? [{ slug: r.slug, updatedAt: r.updatedAt }] : []
  );
}

export async function getSpecialistBySlug(
  slug: string
): Promise<(UiSpecialist & { reviews: UiReview[] }) | null> {
  const rows = await db
    .select({ profile: specialistProfiles, districtName: districts.nameRu })
    .from(specialistProfiles)
    .leftJoin(districts, eq(districts.id, specialistProfiles.districtId))
    .where(and(activeWithSlug, eq(specialistProfiles.slug, slug)))
    .limit(1);
  if (rows.length === 0) return null;

  const profileRow = rows[0];
  const reviewRows = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      text: reviews.text,
      author: user.name,
    })
    .from(reviews)
    .innerJoin(user, eq(user.id, reviews.authorParentId))
    .where(
      and(
        eq(reviews.specialistId, profileRow.profile.id),
        eq(reviews.status, "visible")
      )
    )
    .orderBy(desc(reviews.createdAt));

  return {
    ...toUi({ ...profileRow.profile, districtName: profileRow.districtName }),
    reviews: reviewRows.map((r) => ({
      id: r.id,
      rating: r.rating,
      text: r.text ?? "",
      author: r.author,
    })),
  };
}

export async function getSimilarSpecialists(
  slug: string,
  category: CategoryKey,
  limit = 3
): Promise<UiSpecialist[]> {
  const same = await db
    .select({ profile: specialistProfiles, districtName: districts.nameRu })
    .from(specialistProfiles)
    .leftJoin(districts, eq(districts.id, specialistProfiles.districtId))
    .where(
      and(
        listedInCatalog,
        eq(specialistProfiles.category, category),
        ne(specialistProfiles.slug, slug)
      )
    )
    .orderBy(...CATALOG_ORDER)
    .limit(limit);

  const result = same.map((r) =>
    toUi({ ...r.profile, districtName: r.districtName })
  );

  if (result.length < limit) {
    const extra = await db
      .select({ profile: specialistProfiles, districtName: districts.nameRu })
      .from(specialistProfiles)
      .leftJoin(districts, eq(districts.id, specialistProfiles.districtId))
      .where(
        and(
          listedInCatalog,
          ne(specialistProfiles.category, category),
          ne(specialistProfiles.slug, slug)
        )
      )
      .orderBy(...CATALOG_ORDER)
      .limit(limit - result.length);
    result.push(
      ...extra.map((r) => toUi({ ...r.profile, districtName: r.districtName }))
    );
  }

  return result;
}

