"use server";

import { z } from "zod";
import { and, eq, ne } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { revalidateCatalog } from "@/lib/catalog-cache";
import { auth, getSessionUncached, type Session } from "@/lib/auth";
import { db, type DbExecutor } from "@/db";
import {
  documents,
  notifications,
  specialistProfiles,
  user,
} from "@/db/schema";
import { uniqueSlug } from "@/lib/slug";
import {
  sendDocumentsApprovedEmail,
  sendProfilePublishedEmail,
} from "@/lib/email";
import { stepByKey } from "@/content/verification-steps";
import type { CategoryKey } from "@/lib/specialists-shared";
import {
  deriveVerificationLevel,
  summarizeDocuments,
  type DocumentStatus,
} from "@/lib/verification";

/**
 * Сводка по документам анкеты. Перечень зависит от категории: водителю
 * добавляется удостоверение, поэтому категорию передаём явно.
 */
async function documentSummaryFor(
  executor: DbExecutor,
  profileId: string,
  category: CategoryKey
) {
  const rows = await executor
    .select({ type: documents.type, status: documents.status })
    .from(documents)
    .where(eq(documents.specialistId, profileId));
  return summarizeDocuments(
    rows.map((r) => ({ type: r.type, status: r.status as DocumentStatus })),
    category
  );
}

/* ------------------------- доступ ------------------------- */

type AdminGuard =
  | { ok: false; error: "unauthorized" | "forbidden" }
  | { ok: true; session: Session };

/**
 * Единственная точка входа в админские мутации. Роль проверяется здесь,
 * а не в компоненте: server action вызывается по сети и защищать надо её.
 */
async function requireAdmin(): Promise<AdminGuard> {
  // роль admin — из базы, мимо кэша сессии в куке: снятая роль и блокировка
  // должны закрывать админские действия сразу
  const session = await getSessionUncached(await headers());
  if (!session) return { ok: false, error: "unauthorized" };
  if (session.user.role !== "admin") return { ok: false, error: "forbidden" };
  return { ok: true, session };
}

type Result =
  | { ok: true }
  | { ok: false; error: string; detail?: string };

const fail = (error: string, detail?: string): Result => ({
  ok: false,
  error,
  detail,
});
const done = (): Result => ({ ok: true });

/** Решение модератора по анкете: админка, каталог и сама анкета. */
function revalidateModeration(slug?: string | null) {
  revalidatePath("/admin");
  revalidateCatalog(slug);
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
      category: specialistProfiles.category,
      verificationLevel: specialistProfiles.verificationLevel,
      publishedAt: specialistProfiles.publishedAt,
      // адрес владельца — чтобы сообщить о публикации письмом, а не только
      // уведомлением в кабинете, куда он до ответа модератора не заходит
      ownerEmail: user.email,
      ownerName: user.name,
    })
    .from(specialistProfiles)
    .leftJoin(user, eq(user.id, specialistProfiles.userId))
    .where(eq(specialistProfiles.id, profileId))
    .limit(1);

  if (!profile) return fail("not_found");

  const now = new Date();

  if (action === "publish") {
    /**
     * Фотография для публикации необязательна (решение владельца,
     * 2026-09-13): анкета без неё выходит в каталог с аватаром по полу.
     * Единственный запрет — загруженная, но ещё не просмотренная
     * фотография: показать семье непроверенный снимок нельзя, модератор
     * сначала принимает или отклоняет его. Справки поднимают анкету до
     * премиума, но не решают, показывать человека семье или нет.
     */
    const summary = await documentSummaryFor(db, profileId, profile.category);
    if (summary.photoPending) {
      return fail("photo_pending", "Фотография");
    }

    // уровень выводится из документов: фотография → «Стандартный профиль»,
    // полный комплект → «Премиум-профиль»; он же решает, звать ли в премиум письмом
    const level = deriveVerificationLevel(summary);

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

    // анкета и уведомление о публикации — одной записью: опубликованная анкета,
    // о которой специалисту не сообщили, выглядит как «модератор молчит»
    await db.transaction(async (tx) => {
      await tx
        .update(specialistProfiles)
        .set({
          status: "active",
          slug,
          moderationNote: null,
          // уровень выводится из документов: фотография → «Стандартный
          // профиль», полный комплект → «Премиум-профиль»
          verificationLevel: level,
          // Страховка инварианта «в photo_key только принятое фото»: анкеты,
          // чью фотографию отклонили до 2026-09-13, хранят ссылку на неё до
          // сих пор, и публикация показала бы семье отвергнутый снимок.
          ...(summary.photoApproved ? {} : { photoKey: null }),
          reviewedAt: now,
          publishedAt: profile.publishedAt ?? now,
          updatedAt: now,
        })
        .where(eq(specialistProfiles.id, profileId));

      await tx.insert(notifications).values({
        userId: profile.userId,
        type: "listing_published",
        title: "Анкета опубликована",
        body: "Ваша анкета прошла модерацию и видна в каталоге.",
      });
    });

    // письмо — только после коммита: откатить его нельзя, а извещать о
    // публикации, которой не случилось, хуже, чем не извещать вовсе
    if (profile.ownerEmail) {
      await sendProfilePublishedEmail(
        profile.ownerEmail,
        profile.ownerName ?? "",
        slug,
        level === "premium_verified" ? "premium" : "standard"
      );
    }

    revalidateModeration(slug);
    return done();
  }

  if (action === "hide") {
    await db.transaction(async (tx) => {
      await tx
        .update(specialistProfiles)
        .set({ status: "hidden", reviewedAt: now, updatedAt: now })
        .where(eq(specialistProfiles.id, profileId));

      await tx.insert(notifications).values({
        userId: profile.userId,
        type: "verification_status",
        title: "Анкета скрыта",
        body: "Модератор временно скрыл вашу анкету из каталога.",
      });
    });

    revalidateModeration(profile.slug);
    return done();
  }

  // отклонение: без уведомления с причиной специалист видит только пропавшую
  // анкету, поэтому статус и уведомление пишутся вместе
  await db.transaction(async (tx) => {
    await tx
      .update(specialistProfiles)
      .set({
        status: "rejected",
        moderationNote: note,
        reviewedAt: now,
        updatedAt: now,
      })
      .where(eq(specialistProfiles.id, profileId));

    await tx.insert(notifications).values({
      userId: profile.userId,
      type: "profile_rejected",
      title: "Анкета отклонена",
      body: note ?? "Модератор отклонил анкету.",
    });
  });

  revalidateModeration(profile.slug);
  return done();
}

/* ------------------- уровень верификации ------------------- */

/*
 * Ручного переключателя премиума больше нет. Уровень целиком выводится из
 * документов: «Стандартный профиль» — принята фотография, «Премиум-профиль» — приняты
 * все, включая рекомендуемые. Выдавать премиум «сверху» значило бы утверждать
 * то, что документами не подтверждено.
 */

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
      fileKey: documents.fileKey,
      ownerId: specialistProfiles.userId,
      ownerEmail: user.email,
      ownerName: specialistProfiles.fullName,
      profileId: specialistProfiles.id,
      profileCategory: specialistProfiles.category,
      profileStatus: specialistProfiles.status,
      profileSlug: specialistProfiles.slug,
      verificationLevel: specialistProfiles.verificationLevel,
    })
    .from(documents)
    .innerJoin(
      specialistProfiles,
      eq(specialistProfiles.id, documents.specialistId)
    )
    .innerJoin(user, eq(user.id, specialistProfiles.userId))
    .where(eq(documents.id, documentId))
    .limit(1);

  if (!doc) return fail("not_found");

  /**
   * Решение по фотографии — единственное, что меняет снимок в карточке:
   * принятая фотография в неё попадает, отклонённая исчезает, и семья видит
   * аватар по полу. Анкету это больше не прячет (решение владельца,
   * 2026-09-13): фото необязательно. Отклонённая справка снимает премиум, но
   * не прячет человека: значок честно скажет, что документы не проверены.
   */
  const isPhoto = doc.type === "profile_photo";
  const photoApproved = isPhoto && decision === "approve";
  const photoRejected = isPhoto && decision === "reject";
  const stepTitle = stepByKey.get(doc.type as never)?.title ?? "Документ";

  /**
   * Решение, уровень анкеты и уведомление — в одной транзакции. Полсостояния
   * («паспорт принят, а уровень прежний» или «фотография отклонена, а в
   * photo_key ссылка на неё») никто бы не заметил, пока семья не увидела бы
   * чужой значок или отклонённый снимок. Сводка читается через `tx`: она
   * обязана видеть только что записанное решение.
   */
  const summary = await db.transaction(async (tx) => {
    await tx
      .update(documents)
      .set({
        status: decision === "approve" ? "approved" : "rejected",
        reviewNote: decision === "reject" ? note : null,
        reviewedBy: guard.session.user.id,
        reviewedAt: new Date(),
      })
      .where(eq(documents.id, documentId));

    // Уровень верификации пересчитывается после каждого решения: отклонённый
    // документ снимает значок — иначе семья продолжала бы видеть
    // «Премиум-профиль» по отклонённому паспорту.
    const current = await documentSummaryFor(
      tx,
      doc.profileId,
      doc.profileCategory
    );

    await tx
      .update(specialistProfiles)
      .set({
        verificationLevel: deriveVerificationLevel(current),
        ...(photoApproved ? { photoKey: `/api/documents/${doc.fileKey}` } : {}),
        ...(photoRejected ? { photoKey: null } : {}),
        updatedAt: new Date(),
      })
      .where(eq(specialistProfiles.id, doc.profileId));

    if (photoRejected) {
      await tx.insert(notifications).values({
        userId: doc.ownerId,
        type: "verification_status",
        title: "Фотография не принята",
        body: `Причина: ${(note ?? "").replace(/[.\s]+$/, "")}. Пока в анкете показывается аватар — загрузите другую фотографию в кабинете.`,
      });
    } else {
      // об отклонённой фотографии уже сказано выше — вторым уведомлением о том
      // же решении кабинет не заваливаем
      await tx.insert(notifications).values({
        userId: doc.ownerId,
        type: "verification_status",
        title:
          decision === "approve"
            ? `${stepTitle}: принят`
            : `${stepTitle}: отклонён`,
        body:
          decision === "approve"
            ? "Документ проверен и принят."
            : (note ?? "Документ отклонён, загрузите файл заново."),
      });
    }

    return current;
  });

  // Письмо о пройденной проверке — ровно в момент, когда принят последний
  // документ: до этого вызова комплект полным быть не мог, значит уйдёт один
  // раз. Отправляется после коммита: письмо об откате не отзовёшь.
  if (decision === "approve" && summary.allApproved) {
    await sendDocumentsApprovedEmail(doc.ownerEmail, doc.ownerName);
  }

  if (photoApproved || photoRejected) revalidateCatalog(doc.profileSlug);

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

/* ------------------ отметки для разбора ------------------ */

const clearFlagSchema = z.object({ userId: z.string().min(1) });

/**
 * «Разобрано» в блоке «Подозрительная активность»: снимает отметку, которую
 * ставит лимит открытий контактов. Блокировка — отдельная кнопка
 * (`setUserBlocked`). Если аккаунт снова упрётся в лимит, отметка и
 * уведомление появятся заново.
 */
export async function clearUserFlag(input: unknown): Promise<Result> {
  const guard = await requireAdmin();
  if (!guard.ok) return fail(guard.error);
  const parsed = clearFlagSchema.safeParse(input);
  if (!parsed.success) return fail("invalid");

  const rows = await db
    .update(user)
    .set({ flaggedAt: null, flagReason: null })
    .where(eq(user.id, parsed.data.userId))
    .returning({ id: user.id });
  if (rows.length === 0) return fail("not_found");

  revalidatePath("/admin");
  return done();
}
