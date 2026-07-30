"use server";

import { z } from "zod";
import { and, eq, ne } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth, type Session } from "@/lib/auth";
import { db } from "@/db";
import {
  documents,
  notifications,
  specialistProfiles,
  user,
} from "@/db/schema";
import { uniqueSlug } from "@/lib/slug";
import { stepByKey } from "@/content/verification-steps";

/* ------------------------- доступ ------------------------- */

type AdminGuard =
  | { ok: false; error: "unauthorized" | "forbidden" }
  | { ok: true; session: Session };

/**
 * Единственная точка входа в админские мутации. Роль проверяется здесь,
 * а не в компоненте: server action вызывается по сети и защищать надо её.
 */
async function requireAdmin(): Promise<AdminGuard> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "unauthorized" };
  if (session.user.role !== "admin") return { ok: false, error: "forbidden" };
  return { ok: true, session };
}

type Result =
  | { ok: true }
  | { ok: false; error: string };

const fail = (error: string): Result => ({ ok: false, error });
const done = (): Result => ({ ok: true });

/** Страницы, которые зависят от состояния анкет. */
function revalidateCatalog(slug?: string | null) {
  revalidatePath("/admin");
  revalidatePath("/catalog");
  if (slug) revalidatePath(`/specialists/${slug}`);
}

/* --------------------- модерация анкет --------------------- */

const moderateSchema = z.object({
  profileId: z.string().uuid(),
  action: z.enum(["publish", "hide", "reject"]),
  note: z.string().trim().max(500).optional(),
});

/**
 * Публикация / скрытие / отклонение анкеты (§8.2). Отклонение требует
 * причины — специалист видит её в кабинете.
 */
export async function moderateProfile(input: unknown): Promise<Result> {
  const guard = await requireAdmin();
  if (!guard.ok) return fail(guard.error);

  const parsed = moderateSchema.safeParse(input);
  if (!parsed.success) return fail("invalid");
  const { profileId, action, note } = parsed.data;

  if (action === "reject" && !note) return fail("note_required");

  const [profile] = await db
    .select({
      id: specialistProfiles.id,
      userId: specialistProfiles.userId,
      fullName: specialistProfiles.fullName,
      fullNameLatin: specialistProfiles.fullNameLatin,
      slug: specialistProfiles.slug,
      status: specialistProfiles.status,
      publishedAt: specialistProfiles.publishedAt,
    })
    .from(specialistProfiles)
    .where(eq(specialistProfiles.id, profileId))
    .limit(1);

  if (!profile) return fail("not_found");

  const now = new Date();

  if (action === "publish") {
    // адрес каталога появляется только при первой публикации
    let slug = profile.slug;
    if (!slug) {
      slug = await uniqueSlug(
        profile.fullNameLatin || profile.fullName,
        async (candidate) => {
          const [taken] = await db
            .select({ id: specialistProfiles.id })
            .from(specialistProfiles)
            .where(eq(specialistProfiles.slug, candidate))
            .limit(1);
          return Boolean(taken);
        }
      );
    }

    await db
      .update(specialistProfiles)
      .set({
        status: "active",
        slug,
        moderationNote: null,
        reviewedAt: now,
        publishedAt: profile.publishedAt ?? now,
        updatedAt: now,
      })
      .where(eq(specialistProfiles.id, profileId));

    await db.insert(notifications).values({
      userId: profile.userId,
      type: "listing_published",
      title: "Анкета опубликована",
      body: "Ваша анкета прошла модерацию и видна в каталоге.",
    });

    revalidateCatalog(slug);
    return done();
  }

  if (action === "hide") {
    await db
      .update(specialistProfiles)
      .set({ status: "hidden", reviewedAt: now, updatedAt: now })
      .where(eq(specialistProfiles.id, profileId));

    await db.insert(notifications).values({
      userId: profile.userId,
      type: "verification_status",
      title: "Анкета скрыта",
      body: "Модератор временно скрыл вашу анкету из каталога.",
    });

    revalidateCatalog(profile.slug);
    return done();
  }

  await db
    .update(specialistProfiles)
    .set({
      status: "rejected",
      moderationNote: note,
      reviewedAt: now,
      updatedAt: now,
    })
    .where(eq(specialistProfiles.id, profileId));

  await db.insert(notifications).values({
    userId: profile.userId,
    type: "profile_rejected",
    title: "Анкета отклонена",
    body: note ?? "Модератор отклонил анкету.",
  });

  revalidateCatalog(profile.slug);
  return done();
}

/* ------------------- уровень верификации ------------------- */

const verificationSchema = z.object({
  profileId: z.string().uuid(),
  level: z.enum(["unverified", "verified", "premium_verified"]),
});

export async function setVerificationLevel(input: unknown): Promise<Result> {
  const guard = await requireAdmin();
  if (!guard.ok) return fail(guard.error);

  const parsed = verificationSchema.safeParse(input);
  if (!parsed.success) return fail("invalid");

  const [profile] = await db
    .select({ slug: specialistProfiles.slug })
    .from(specialistProfiles)
    .where(eq(specialistProfiles.id, parsed.data.profileId))
    .limit(1);
  if (!profile) return fail("not_found");

  await db
    .update(specialistProfiles)
    .set({ verificationLevel: parsed.data.level, updatedAt: new Date() })
    .where(eq(specialistProfiles.id, parsed.data.profileId));

  revalidateCatalog(profile.slug);
  return done();
}

/* ---------------- очередь проверки документов ---------------- */

const documentSchema = z.object({
  documentId: z.string().uuid(),
  decision: z.enum(["approve", "reject"]),
  note: z.string().trim().max(500).optional(),
});

export async function reviewDocument(input: unknown): Promise<Result> {
  const guard = await requireAdmin();
  if (!guard.ok) return fail(guard.error);

  const parsed = documentSchema.safeParse(input);
  if (!parsed.success) return fail("invalid");
  const { documentId, decision, note } = parsed.data;

  if (decision === "reject" && !note) return fail("note_required");

  const [doc] = await db
    .select({
      id: documents.id,
      type: documents.type,
      ownerId: specialistProfiles.userId,
    })
    .from(documents)
    .innerJoin(
      specialistProfiles,
      eq(specialistProfiles.id, documents.specialistId)
    )
    .where(eq(documents.id, documentId))
    .limit(1);

  if (!doc) return fail("not_found");

  await db
    .update(documents)
    .set({
      status: decision === "approve" ? "approved" : "rejected",
      reviewNote: decision === "reject" ? note : null,
      reviewedBy: guard.session.user.id,
      reviewedAt: new Date(),
    })
    .where(eq(documents.id, documentId));

  const stepTitle = stepByKey.get(doc.type as never)?.title ?? "Документ";
  await db.insert(notifications).values({
    userId: doc.ownerId,
    type: "verification_status",
    title:
      decision === "approve" ? `${stepTitle}: принят` : `${stepTitle}: отклонён`,
    body:
      decision === "approve"
        ? "Документ проверен и принят."
        : (note ?? "Документ отклонён, загрузите файл заново."),
  });

  revalidatePath("/admin");
  revalidatePath("/specialist");
  return done();
}

/* ----------------- блокировка пользователей ----------------- */

const banSchema = z.object({
  userId: z.string().min(1),
  blocked: z.boolean(),
  reason: z.string().trim().max(200).optional(),
});

/**
 * Блокировка идёт через Better Auth, а не прямым UPDATE: плагин admin
 * дополнительно удаляет активные сессии, иначе заблокированный работал бы
 * до истечения куки. Вход блокируется на создании сессии (§9 R1).
 */
export async function setUserBlocked(input: unknown): Promise<Result> {
  const guard = await requireAdmin();
  if (!guard.ok) return fail(guard.error);

  const parsed = banSchema.safeParse(input);
  if (!parsed.success) return fail("invalid");
  const { userId, blocked, reason } = parsed.data;

  if (userId === guard.session.user.id) return fail("self");

  const [target] = await db
    .select({ id: user.id, role: user.role })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (!target) return fail("not_found");
  // администраторов не блокируем: это верный путь потерять доступ к панели
  if (target.role === "admin") return fail("admin_target");

  const requestHeaders = await headers();
  try {
    if (blocked) {
      await auth.api.banUser({
        body: { userId, banReason: reason || "Нарушение правил платформы" },
        headers: requestHeaders,
      });
    } else {
      await auth.api.unbanUser({ body: { userId }, headers: requestHeaders });
    }
  } catch (error) {
    console.error("[admin] ban toggle failed", { userId, blocked, error });
    return fail("ban_failed");
  }

  // заблокированный специалист не должен оставаться в каталоге
  if (blocked) {
    const [profile] = await db
      .select({ id: specialistProfiles.id, slug: specialistProfiles.slug })
      .from(specialistProfiles)
      .where(
        and(
          eq(specialistProfiles.userId, userId),
          ne(specialistProfiles.status, "hidden")
        )
      )
      .limit(1);

    if (profile) {
      await db
        .update(specialistProfiles)
        .set({ status: "hidden", updatedAt: new Date() })
        .where(eq(specialistProfiles.id, profile.id));
      revalidateCatalog(profile.slug);
    }
  }

  revalidatePath("/admin");
  return done();
}
