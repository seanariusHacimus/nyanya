import { and, asc, count, desc, eq, isNotNull, sql } from "drizzle-orm";
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
  type DocumentStatus,
} from "@/lib/verification";
import { parseUnlockLimits } from "@/lib/unlock-limits";

export type ProfileStatus =
  | "draft"
  | "pending_review"
  | "active"
  | "hidden"
  | "rejected";

export type VerificationLevel = "unverified" | "verified" | "premium_verified";

export type AdminStats = {
  parents: number;
  specialists: number;
  pendingProfiles: number;
  pendingDocuments: number;
  unlocks: number;
  /** доля родителей, открывших хотя бы одни контакты, % */
  conversion: number;
  /** аккаунты с отметкой для разбора (лимит открытий контактов) */
  flagged: number;
  /** отзывы, которые ждут модератора в /admin/reviews */
  pendingReviews: number;
};

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
  /** отметка для разбора — см. `flagged` в AdminData */
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

export type AdminData = {
  stats: AdminStats;
  profiles: AdminProfileRow[];
  documentQueue: AdminDocumentRow[];
  users: AdminUserRow[];
  usersTotal: number;
  /** блок «Подозрительная активность» на обзоре, свежие отметки первыми */
  flagged: AdminFlaggedRow[];
  /** действующий суточный лимит открытий контактов — для подписи к блоку */
  unlockDailyCap: number;
};

/** Сколько пользователей грузим в таблицу; фильтр по ним — на клиенте. */
const USERS_LIMIT = 200;

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

export async function getAdminData(): Promise<AdminData> {
  const [
    roleRows,
    statusRows,
    pendingDocRows,
    unlockRows,
    unlockParentRows,
    profileRows,
    documentRows,
    userRows,
    userTotalRows,
    allDocumentRows,
    flaggedRows,
    flaggedTotalRows,
    pendingReviewTotal,
  ] = await Promise.all([
    db.select({ role: user.role, n: count() }).from(user).groupBy(user.role),
    db
      .select({ status: specialistProfiles.status, n: count() })
      .from(specialistProfiles)
      .groupBy(specialistProfiles.status),
    db
      .select({ n: count() })
      .from(documents)
      .where(eq(documents.status, "pending")),
    db.select({ n: count() }).from(contactUnlocks),
    db
      .select({ n: sql<number>`count(distinct ${contactUnlocks.parentId})::int` })
      .from(contactUnlocks),
    db
      .select({
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
      })
      .from(specialistProfiles)
      .innerJoin(user, eq(user.id, specialistProfiles.userId))
      .orderBy(STATUS_ORDER, asc(specialistProfiles.fullName)),
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
      .where(eq(documents.status, "pending"))
      .orderBy(asc(documents.createdAt)),
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
      .orderBy(asc(user.createdAt))
      .limit(USERS_LIMIT),
    db.select({ n: count() }).from(user),
    db
      .select({
        specialistId: documents.specialistId,
        type: documents.type,
        status: documents.status,
      })
      .from(documents),
    // отдельным запросом, а не из users: список пользователей обрезан по дате
    // регистрации, и отмеченный аккаунт мог в него не попасть
    db
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
      .limit(FLAGGED_LIMIT),
    db.select({ n: count() }).from(user).where(isNotNull(user.flaggedAt)),
    getPendingReviewCount(),
  ]);

  const byRole = (role: string) =>
    roleRows.find((r) => r.role === role)?.n ?? 0;
  const parents = byRole("parent");
  const unlockingParents = unlockParentRows[0]?.n ?? 0;

  // документы группируем в памяти: строк мало, а отдельный агрегирующий
  // запрос на каждую анкету дал бы N+1
  const docsByProfile = new Map<string, { type: string; status: DocumentStatus }[]>();
  for (const d of allDocumentRows) {
    const list = docsByProfile.get(d.specialistId) ?? [];
    list.push({ type: d.type, status: d.status as DocumentStatus });
    docsByProfile.set(d.specialistId, list);
  }

  return {
    stats: {
      parents,
      specialists: byRole("specialist"),
      pendingProfiles:
        statusRows.find((r) => r.status === "pending_review")?.n ?? 0,
      pendingDocuments: pendingDocRows[0]?.n ?? 0,
      unlocks: unlockRows[0]?.n ?? 0,
      conversion: parents ? Math.round((unlockingParents / parents) * 100) : 0,
      flagged: flaggedTotalRows[0]?.n ?? 0,
      pendingReviews: pendingReviewTotal,
    },
    profiles: profileRows.map((p) => {
      const summary = summarizeDocuments(docsByProfile.get(p.id) ?? [], p.category);
      return {
        ...p,
        approvedDocuments: summary.approvedRequired.length,
        photoPending: summary.photoPending,
        requiredDocuments: summary.requiredCount,
        blockingSteps: stepTitles(summary.blockingRequired),
        approvedOptional: summary.approvedOptional.length,
        optionalDocuments: summary.optionalCount,
      };
    }),
    documentQueue: documentRows.map((d) => ({
      ...d,
      createdAt: d.createdAt.toISOString(),
    })),
    users: userRows.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
      flaggedAt: u.flaggedAt?.toISOString() ?? null,
    })),
    usersTotal: userTotalRows[0]?.n ?? 0,
    flagged: flaggedRows.flatMap((f) =>
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
    unlockDailyCap: parseUnlockLimits(process.env).dailyCap,
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

/** Отзывы, которые ждут модератора, — бейдж «Отзывы» и счётчик очереди. */
export async function getPendingReviewCount(): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(reviews)
    .where(eq(reviews.status, "pending"));
  return row?.n ?? 0;
}

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
