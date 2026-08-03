import { asc, count, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  contactUnlocks,
  documents,
  specialistProfiles,
  user,
} from "@/db/schema";
import type { CategoryKey } from "@/lib/specialists-shared";
import {
  stepTitles,
  summarizeDocuments,
  type DocumentStatus,
} from "@/lib/verification";

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
};

export type AdminProfileRow = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  category: CategoryKey;
  status: ProfileStatus;
  verificationLevel: VerificationLevel;
  trustScore: number;
  slug: string | null;
  moderationNote: string | null;
  banned: boolean;
  /** Сколько обязательных документов принято — публикация требует полного комплекта. */
  approvedDocuments: number;
  requiredDocuments: number;
  /** Названия шагов, мешающих публикации (не загружены, ждут проверки, отклонены). */
  blockingSteps: string;
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
};

export type AdminData = {
  stats: AdminStats;
  profiles: AdminProfileRow[];
  documentQueue: AdminDocumentRow[];
  users: AdminUserRow[];
  usersTotal: number;
};

/** Сколько пользователей грузим в таблицу; фильтр по ним — на клиенте. */
const USERS_LIMIT = 200;

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
        trustScore: specialistProfiles.trustScore,
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
    },
    profiles: profileRows.map((p) => {
      const summary = summarizeDocuments(docsByProfile.get(p.id) ?? []);
      return {
        ...p,
        approvedDocuments: summary.approvedCount,
        requiredDocuments: summary.requiredCount,
        blockingSteps: stepTitles([
          ...summary.missing,
          ...summary.pending,
          ...summary.rejected,
        ]),
      };
    }),
    documentQueue: documentRows.map((d) => ({
      ...d,
      createdAt: d.createdAt.toISOString(),
    })),
    users: userRows.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
    })),
    usersTotal: userTotalRows[0]?.n ?? 0,
  };
}
