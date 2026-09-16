import { cache } from "react";
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db";
import {
  contactUnlocks,
  documents,
  reviews,
  specialistProfiles,
  user,
} from "@/db/schema";
import type { ReviewStatus } from "@/lib/review-policy";
import type { CategoryKey } from "@/lib/specialists-shared";
import {
  stepTitles,
  summarizeDocuments,
  type DocumentRow,
} from "@/lib/verification";
import { parseUnlockLimits } from "@/lib/unlock-limits";

export type ProfileStatus =
  | "draft"
  | "pending_review"
  | "active"
  | "hidden"
  | "rejected";

export type VerificationLevel = "unverified" | "verified" | "premium_verified";

/**
 * Что показывает список анкет: «все», «ждут решения» (всё, кроме
 * опубликованных) или один конкретный статус. Приходит из адреса — `?status=`.
 */
export type ProfileFilter = "all" | "waiting" | ProfileStatus;

/** Сколько строк на странице списка — анкеты, документы, люди. */
export const PAGE_SIZE = 50;

/** Одна страница списка вместе с общим числом строк — для «Показано A–B из N». */
export type Page<T> = {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
};

/**
 * Бейджи в сайдбаре — единственное, ради чего каркас админки (`layout.tsx`)
 * ходит в базу. Четыре счётчика: где ждёт работа.
 */
export type AdminNavCounts = {
  pendingProfiles: number;
  pendingDocuments: number;
  /** отзывы, которые ждут модератора в /admin/reviews */
  pendingReviews: number;
  /** аккаунты с отметкой для разбора (лимит открытий контактов) */
  flagged: number;
};

/** Плитки обзора: бейджи плюс то, что считается только для /admin. */
export type AdminStats = AdminNavCounts & {
  parents: number;
  specialists: number;
  unlocks: number;
  /** доля родителей, открывших хотя бы одни контакты, % */
  conversion: number;
};

/** Всего анкет и сколько из них опубликовано — подпись над списком анкет. */
export type ProfileTotals = { total: number; active: number };

export type AdminProfileRow = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  category: CategoryKey;
  status: ProfileStatus;
  verificationLevel: VerificationLevel;
  slug: string | null;
  moderationNote: string | null;
  banned: boolean;
  /** Принято обязательных документов из скольких — до «Премиум-профиля». */
  approvedDocuments: number;
  /** Фото загружено и ждёт решения — до него публиковать нельзя. */
  photoPending: boolean;
  requiredDocuments: number;
  /** Названия обязательных шагов, которых не хватает до «Премиум-профиля». */
  blockingSteps: string;
  /** Сколько рекомендуемых принято — от них зависит «Премиум-профиль». */
  approvedOptional: number;
  optionalDocuments: number;
};

export type AdminDocumentRow = {
  id: string;
  specialistId: string;
  specialistName: string;
  type: string;
  fileKey: string;
  fileName: string | null;
  createdAt: string;
};

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  banned: boolean;
  banReason: string | null;
  createdAt: string;
  /** отметка для разбора — см. `flagged` в AdminStats */
  flaggedAt: string | null;
};

/**
 * Аккаунт, исчерпавший суточный лимит открытий контактов
 * (`lib/actions/unlock-contacts.ts`). Счётчики — на момент загрузки панели:
 * по ним модератор отличает семью с большим поиском от выгрузки.
 */
export type AdminFlaggedRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  banned: boolean;
  createdAt: string;
  flaggedAt: string;
  flagReason: string | null;
  /** новых открытий за последние 24 часа */
  unlocks24h: number;
  unlocksTotal: number;
};

/** Сколько отмеченных аккаунтов показываем на обзоре; общее число — в stats.flagged. */
const FLAGGED_LIMIT = 100;

/**
 * Порядок модерации: сначала то, что ждёт решения, затем отклонённые и
 * скрытые, живые анкеты — в конце.
 */
const STATUS_ORDER = sql`case ${specialistProfiles.status}
  when 'pending_review' then 0
  when 'draft' then 1
  when 'rejected' then 2
  when 'hidden' then 3
  else 4 end`;

/**
 * Экранирование спецсимволов LIKE. Без него `?q=%` вернул бы всех, а `_`
 * молча подменял бы любой символ.
 */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Анкеты по статусам — один GROUP BY на весь рендер. Из него берут число и
 * бейдж «Анкеты» в сайдбаре, и подпись «Опубликовано X из Y» над списком, и
 * плитка обзора: три подписи, один запрос.
 */
const profilesByStatus = cache(async (): Promise<Map<string, number>> => {
  const rows = await db
    .select({ status: specialistProfiles.status, n: count() })
    .from(specialistProfiles)
    .groupBy(specialistProfiles.status);
  return new Map<string, number>(rows.map((r) => [r.status, r.n]));
});

/**
 * Счётчики для бейджей — всё, что грузит каркас админки.
 *
 * `cache` из React делит результат между каркасом (`layout.tsx`) и страницей
 * раздела в пределах одного серверного рендера. Раньше обе стороны вызывали
 * общую `getAdminData`, которая выгружала все анкеты, все документы и две
 * сотни пользователей — дважды на каждый запрос.
 */
export const getAdminNavCounts = cache(async (): Promise<AdminNavCounts> => {
  const [byStatus, docRows, pendingReviews, flaggedRows] = await Promise.all([
    profilesByStatus(),
    db
      .select({ n: count() })
      .from(documents)
      .where(eq(documents.status, "pending")),
    getPendingReviewCount(),
    db.select({ n: count() }).from(user).where(isNotNull(user.flaggedAt)),
  ]);

  return {
    pendingProfiles: byStatus.get("pending_review") ?? 0,
    pendingDocuments: docRows[0]?.n ?? 0,
    pendingReviews,
    flagged: flaggedRows[0]?.n ?? 0,
  };
});

/** Подпись «Опубликовано X из Y» — из того же GROUP BY, что и бейдж. */
export const getProfileTotals = cache(async (): Promise<ProfileTotals> => {
  const byStatus = await profilesByStatus();
  let total = 0;
  for (const n of byStatus.values()) total += n;
  return { total, active: byStatus.get("active") ?? 0 };
});

/**
 * Плитки обзора. Считаются только для /admin: группировка аккаунтов по ролям
 * и открытия контактов нужны одной странице, а каркас с его бейджами висит на
 * всех — включая карточку анкеты и очередь отзывов.
 */
export const getAdminStats = cache(async (): Promise<AdminStats> => {
  const [nav, roleRows, unlockRows] = await Promise.all([
    getAdminNavCounts(),
    db.select({ role: user.role, n: count() }).from(user).groupBy(user.role),
    db
      .select({
        n: count(),
        parents: sql<number>`count(distinct ${contactUnlocks.parentId})::int`,
      })
      .from(contactUnlocks),
  ]);

  const byRole = (role: string) => roleRows.find((r) => r.role === role)?.n ?? 0;
  const parents = byRole("parent");
  const unlockingParents = unlockRows[0]?.parents ?? 0;

  return {
    ...nav,
    parents,
    specialists: byRole("specialist"),
    unlocks: unlockRows[0]?.n ?? 0,
    conversion: parents ? Math.round((unlockingParents / parents) * 100) : 0,
  };
});

/**
 * Документы только для показанных анкет — один GROUP BY вместо выгрузки всей
 * таблицы. Раньше админка читала `documents` целиком на каждый запрос, чтобы
 * посчитать «до премиума: x/y» у каждой анкеты.
 */
async function documentsByProfile(
  ids: string[]
): Promise<Map<string, DocumentRow[]>> {
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({
      specialistId: documents.specialistId,
      docs: sql<DocumentRow[]>`jsonb_agg(jsonb_build_object('type', ${documents.type}, 'status', ${documents.status}))`,
    })
    .from(documents)
    .where(inArray(documents.specialistId, ids))
    .groupBy(documents.specialistId);
  return new Map(rows.map((r) => [r.specialistId, r.docs]));
}

/** Колонки строки анкеты — одинаковые в обзоре и в списке. */
const profileColumns = {
  id: specialistProfiles.id,
  userId: specialistProfiles.userId,
  fullName: specialistProfiles.fullName,
  email: user.email,
  category: specialistProfiles.category,
  status: specialistProfiles.status,
  verificationLevel: specialistProfiles.verificationLevel,
  slug: specialistProfiles.slug,
  moderationNote: specialistProfiles.moderationNote,
  banned: user.banned,
};

type ProfileBase = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  category: CategoryKey;
  status: ProfileStatus;
  verificationLevel: VerificationLevel;
  slug: string | null;
  moderationNote: string | null;
  banned: boolean;
};

function toProfileRow(p: ProfileBase, docs: DocumentRow[]): AdminProfileRow {
  const summary = summarizeDocuments(docs, p.category);
  return {
    ...p,
    approvedDocuments: summary.approvedRequired.length,
    photoPending: summary.photoPending,
    requiredDocuments: summary.requiredCount,
    blockingSteps: stepTitles(summary.blockingRequired),
    approvedOptional: summary.approvedOptional.length,
    optionalDocuments: summary.optionalCount,
  };
}

async function withDocuments(rows: ProfileBase[]): Promise<AdminProfileRow[]> {
  const docs = await documentsByProfile(rows.map((r) => r.id));
  return rows.map((r) => toProfileRow(r, docs.get(r.id) ?? []));
}

/**
 * «Не в каталоге» для обзора: всё, кроме опубликованного, — первые `limit`
 * строк и сколько их всего. Полный постраничный список живёт на
 * /admin/profiles?status=waiting, ссылка на него стоит под блоком.
 */
export async function getModerationQueue(
  limit = PAGE_SIZE
): Promise<{ rows: AdminProfileRow[]; total: number }> {
  const where = ne(specialistProfiles.status, "active");
  const [rows, totalRows] = await Promise.all([
    db
      .select(profileColumns)
      .from(specialistProfiles)
      .innerJoin(user, eq(user.id, specialistProfiles.userId))
      .where(where)
      .orderBy(STATUS_ORDER, asc(specialistProfiles.fullName), asc(specialistProfiles.id))
      .limit(limit),
    db
      .select({ n: count() })
      .from(specialistProfiles)
      .where(where),
  ]);
  return { rows: await withDocuments(rows), total: totalRows[0]?.n ?? 0 };
}

/**
 * Страница списка анкет: фильтр по статусу и поиск по имени или почте — оба
 * из адреса, оба уходят в один `where` — он же считает и строки, и их общее число.
 */
export async function getAdminProfilesPage(opts: {
  page: number;
  status: ProfileFilter;
  q: string;
}): Promise<Page<AdminProfileRow>> {
  const conditions: SQL[] = [];
  if (opts.status === "waiting") {
    conditions.push(ne(specialistProfiles.status, "active"));
  } else if (opts.status !== "all") {
    conditions.push(eq(specialistProfiles.status, opts.status));
  }
  if (opts.q) {
    const like = `%${escapeLike(opts.q)}%`;
    const match = or(
      ilike(specialistProfiles.fullName, like),
      ilike(user.email, like)
    );
    if (match) conditions.push(match);
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select(profileColumns)
      .from(specialistProfiles)
      .innerJoin(user, eq(user.id, specialistProfiles.userId))
      .where(where)
      // вторичная сортировка по id обязательна: без неё строки с одинаковым
      // именем прыгают между страницами
      .orderBy(STATUS_ORDER, asc(specialistProfiles.fullName), asc(specialistProfiles.id))
      .limit(PAGE_SIZE)
      .offset((opts.page - 1) * PAGE_SIZE),
    db
      .select({ n: count() })
      .from(specialistProfiles)
      .innerJoin(user, eq(user.id, specialistProfiles.userId))
      .where(where),
  ]);

  return {
    rows: await withDocuments(rows),
    total: totalRows[0]?.n ?? 0,
    page: opts.page,
    pageSize: PAGE_SIZE,
  };
}

/** Очередь документов: только ждущие решения, самые давние первыми. */
export async function getDocumentQueue(
  page: number
): Promise<Page<AdminDocumentRow>> {
  const where = eq(documents.status, "pending");
  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: documents.id,
        specialistId: documents.specialistId,
        specialistName: specialistProfiles.fullName,
        type: documents.type,
        fileKey: documents.fileKey,
        fileName: documents.fileName,
        createdAt: documents.createdAt,
      })
      .from(documents)
      .innerJoin(
        specialistProfiles,
        eq(specialistProfiles.id, documents.specialistId)
      )
      .where(where)
      .orderBy(asc(documents.createdAt), asc(documents.id))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ n: count() }).from(documents).where(where),
  ]);

  return {
    rows: rows.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() })),
    total: totalRows[0]?.n ?? 0,
    page,
    pageSize: PAGE_SIZE,
  };
}

/**
 * Поиск людей — на сервере, по адресу `?q=`. Раньше в браузер уходили двести
 * самых старых аккаунтов и фильтровались там, поэтому после двухсотой
 * регистрации новых было не найти.
 *
 * Со знаком «@» считаем, что ищут адрес, и берём начало строки — по индексу
 * `user_email_lower_idx`. Иначе ищем вхождение в имя или адрес: это
 * последовательный просмотр, но на нынешних объёмах он занимает миллисекунды
 * (индекс триграмм потребовал бы CREATE EXTENSION — вернуться к этому,
 * когда аккаунтов станет больше 20 000).
 */
export async function searchUsers(opts: {
  q: string;
  page: number;
}): Promise<Page<AdminUserRow>> {
  const term = opts.q.toLowerCase();
  const where: SQL | undefined = !term
    ? undefined
    : term.includes("@")
      ? sql`lower(${user.email}) like ${escapeLike(term) + "%"}`
      : or(
          ilike(user.name, `%${escapeLike(term)}%`),
          ilike(user.email, `%${escapeLike(term)}%`)
        );

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        banned: user.banned,
        banReason: user.banReason,
        createdAt: user.createdAt,
        flaggedAt: user.flaggedAt,
      })
      .from(user)
      .where(where)
      // новые сверху: модератор ищет того, кто только что зарегистрировался
      .orderBy(desc(user.createdAt), asc(user.id))
      .limit(PAGE_SIZE)
      .offset((opts.page - 1) * PAGE_SIZE),
    db.select({ n: count() }).from(user).where(where),
  ]);

  return {
    rows: rows.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
      flaggedAt: u.flaggedAt?.toISOString() ?? null,
    })),
    total: totalRows[0]?.n ?? 0,
    page: opts.page,
    pageSize: PAGE_SIZE,
  };
}

/**
 * Блок «Подозрительная активность» на обзоре. Отдельным запросом, а не из
 * списка людей: список постраничный, и отмеченный аккаунт в него мог не
 * попасть. Общее число отмеченных — `stats.flagged`.
 */
export async function getFlaggedUsers(
  limit = FLAGGED_LIMIT
): Promise<{ rows: AdminFlaggedRow[]; dailyCap: number }> {
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      banned: user.banned,
      createdAt: user.createdAt,
      flaggedAt: user.flaggedAt,
      flagReason: user.flagReason,
      // подзапросы написаны целиком: в выборке из одной таблицы Drizzle
      // опускает имя таблицы у колонок, и "id" внутри подзапроса оказался
      // бы contact_unlocks.id
      unlocks24h: sql<number>`(select count(*) from contact_unlocks cu where cu.parent_id = "user"."id" and cu.unlocked_at > now() - interval '24 hours')::int`,
      unlocksTotal: sql<number>`(select count(*) from contact_unlocks cu where cu.parent_id = "user"."id")::int`,
    })
    .from(user)
    .where(isNotNull(user.flaggedAt))
    .orderBy(desc(user.flaggedAt))
    .limit(limit);

  return {
    rows: rows.flatMap((f) =>
      f.flaggedAt
        ? [
            {
              ...f,
              createdAt: f.createdAt.toISOString(),
              flaggedAt: f.flaggedAt.toISOString(),
            },
          ]
        : []
    ),
    dailyCap: parseUnlockLimits(process.env).dailyCap,
  };
}

/* ------------------------------ отзывы ------------------------------ */

/**
 * Строка очереди отзывов. Кроме самого отзыва — то, по чему модератор отличает
 * семью от второго аккаунта: пятёрка без текста выглядит одинаково, а
 * «аккаунту два часа, контакты открыты вчера, это седьмой отзыв автора» — нет.
 */
export type AdminReviewQueueRow = {
  id: string;
  rating: number;
  text: string;
  status: ReviewStatus;
  /** ISO — когда отзыв появился */
  createdAt: string;
  /** ISO — последняя правка автора; публикация сверяет её (`seenUpdatedAt`) */
  updatedAt: string;
  author: string;
  authorEmail: string;
  authorRole: string;
  /** полных суток с регистрации автора */
  accountAgeDays: number;
  /** полных суток с открытия контактов этого специалиста; null — не открывал */
  unlockAgeDays: number | null;
  /** всех отзывов автора, включая этот */
  authorReviewsTotal: number;
  specialistId: string;
  specialistName: string;
  specialistSlug: string | null;
};

/**
 * Отзывы, которые ждут модератора, — бейдж «Отзывы» и счётчик очереди.
 * `cache`: на /admin/reviews это число просят и каркас, и страница.
 */
export const getPendingReviewCount = cache(async (): Promise<number> => {
  const [row] = await db
    .select({ n: count() })
    .from(reviews)
    .where(eq(reviews.status, "pending"));
  return row?.n ?? 0;
});

/** Сколько отзывов показываем в очереди; число ждущих — getPendingReviewCount. */
export const REVIEW_QUEUE_LIMIT = 200;

/**
 * Очередь: сначала ждущие решения — от самых давних (как документы), затем
 * остальные — свежие первыми.
 */
export async function getAdminReviewQueue(): Promise<AdminReviewQueueRow[]> {
  const rows = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      text: reviews.text,
      status: reviews.status,
      createdAt: reviews.createdAt,
      updatedAt: reviews.updatedAt,
      author: user.name,
      authorEmail: user.email,
      authorRole: user.role,
      accountAgeDays: sql<number>`floor(extract(epoch from (now() - ${user.createdAt})) / 86400)::int`,
      unlockAgeDays: sql<number | null>`floor(extract(epoch from (now() - ${contactUnlocks.unlockedAt})) / 86400)::int`,
      // подзапрос целиком: в нём своя таблица, и Drizzle не должен подставлять имена колонок
      authorReviewsTotal: sql<number>`(select count(*) from reviews r2 where r2.author_parent_id = "reviews"."author_parent_id")::int`,
      specialistId: specialistProfiles.id,
      specialistName: specialistProfiles.fullName,
      specialistSlug: specialistProfiles.slug,
    })
    .from(reviews)
    .innerJoin(user, eq(user.id, reviews.authorParentId))
    .innerJoin(specialistProfiles, eq(specialistProfiles.id, reviews.specialistId))
    .leftJoin(
      contactUnlocks,
      and(
        eq(contactUnlocks.parentId, reviews.authorParentId),
        eq(contactUnlocks.specialistId, reviews.specialistId)
      )
    )
    .orderBy(
      sql`case ${reviews.status} when 'pending' then 0 when 'visible' then 1 else 2 end`,
      sql`case when ${reviews.status} = 'pending' then ${reviews.updatedAt} end asc`,
      desc(reviews.updatedAt)
    )
    .limit(REVIEW_QUEUE_LIMIT);

  return rows.map((r) => ({
    ...r,
    text: r.text ?? "",
    unlockAgeDays: r.unlockAgeDays === null ? null : Number(r.unlockAgeDays),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}
