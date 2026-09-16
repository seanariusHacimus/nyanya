"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { revalidateCatalog } from "@/lib/catalog-cache";
import { auth, getSessionUncached } from "@/lib/auth";
import { db } from "@/db";
import { specialistProfiles, documents, notifications, user } from "@/db/schema";
import {
  saveDocument,
  removeDocument,
  isAllowedMime,
  MAX_FILE_BYTES,
} from "@/lib/storage";
import {
  stepByKey,
} from "@/content/verification-steps";
import { levelForProfile } from "@/lib/document-level";
import { detectMime, matchesDeclaredMime } from "@/lib/file-type";
import { sendProfileSubmittedEmail } from "@/lib/email";

/* ------------------------- вспомогательное ------------------------- */

async function requireSpecialist() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "unauthorized" as const };
  if (session.user.role !== "specialist") return { error: "forbidden" as const };
  return { session };
}

/** Анкета текущего специалиста; создаётся при первом обращении. */
async function ensureProfile(userId: string, fallbackName: string) {
  const existing = await db
    .select()
    .from(specialistProfiles)
    .where(eq(specialistProfiles.userId, userId))
    .limit(1);
  if (existing[0]) return existing[0];

  const created = await db
    .insert(specialistProfiles)
    .values({
      userId,
      category: "nanny",
      fullName: fallbackName || "Без имени",
      status: "draft",
    })
    .returning();
  return created[0];
}

/* --------------------------- анкета (§8) --------------------------- */

const profileSchema = z.object({
  fullName: z.string().trim().max(120),
  category: z.enum(["nanny", "caregiver", "tutor", "driver"]),
  birthDate: z.string().trim().max(20).optional().or(z.literal("")),
  gender: z.enum(["female", "male"]).nullable().optional(),
  districtId: z.coerce.number().int().positive().optional().nullable(),
  experienceYears: z.coerce.number().int().min(0).max(60),
  education: z.string().trim().max(300).optional().or(z.literal("")),
  languages: z.array(z.string().trim().max(40)).max(10),
  englishLevel: z.enum(["none", "basic", "fluent"]),
  priceAmount: z.coerce.number().int().min(0).max(100_000_000),
  priceUnit: z.enum(["hour", "day", "month"]),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  extraOffer: z.string().trim().max(500).optional().or(z.literal("")),
  hasCar: z.boolean(),
  liveIn: z.boolean(),
  nightAvailable: z.boolean(),
  newbornExp: z.boolean(),
});

export async function saveSpecialistProfile(input: unknown) {
  const guard = await requireSpecialist();
  if ("error" in guard) return { ok: false as const, error: guard.error };

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "invalid" as const };

  const profile = await ensureProfile(
    guard.session.user.id,
    guard.session.user.name
  );
  const d = parsed.data;

  await db
    .update(specialistProfiles)
    .set({
      fullName: d.fullName || "Без имени",
      category: d.category,
      birthDate: d.birthDate || null,
      // пол пишем только когда он выбран: вкладка со старой версией формы
      // не должна стирать значение, которое уже стоит в базе
      ...(d.gender ? { gender: d.gender } : {}),
      districtId: d.districtId ?? null,
      experienceYears: d.experienceYears,
      education: d.education || null,
      languages: d.languages,
      englishLevel: d.englishLevel,
      priceAmount: d.priceAmount,
      priceUnit: d.priceUnit,
      description: d.description || null,
      extraOffer: d.extraOffer || null,
      hasCar: d.hasCar,
      liveIn: d.liveIn,
      nightAvailable: d.nightAvailable,
      newbornExp: d.newbornExp,
      updatedAt: new Date(),
    })
    .where(eq(specialistProfiles.id, profile.id));

  // Имя специалист называет только в анкете; шапка кабинета и письма берут
  // его из user — без этой записи они показывали бы пустоту или старое имя.
  if (d.fullName && d.fullName !== guard.session.user.name) {
    await db
      .update(user)
      .set({ name: d.fullName, updatedAt: new Date() })
      .where(eq(user.id, guard.session.user.id));
    // имя записано мимо Better Auth: перечитываем сессию из базы, иначе кэш в
    // куке до пяти минут показывал бы в шапке кабинета прежнее имя
    await getSessionUncached(await headers());
  }

  revalidatePath("/specialist");
  // Опубликованная анкета правится на месте (`saveSpecialistProfile` не
  // отправляет её на повторную модерацию), а выдача каталога закэширована на
  // минуту: без сброса тега семья ещё минуту видела бы прежние имя, район,
  // цену и категорию — и анкета оставалась бы в той выборке, из которой
  // только что вышла. Условие то же, что у `wasActive` ниже.
  if (profile.status === "active") revalidateCatalog(profile.slug);
  return { ok: true as const };
}

/* --------------------- документы верификации ---------------------- */

export async function uploadVerificationDocument(formData: FormData) {
  const guard = await requireSpecialist();
  if ("error" in guard) return { ok: false as const, error: guard.error };

  const stepKey = String(formData.get("step") ?? "");
  const step = stepByKey.get(stepKey as never);
  if (!step) return { ok: false as const, error: "invalid_step" as const };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { ok: false as const, error: "no_file" as const };
  if (file.size > MAX_FILE_BYTES)
    return { ok: false as const, error: "too_large" as const };
  if (!isAllowedMime(file.type))
    return { ok: false as const, error: "bad_type" as const };

  const profile = await ensureProfile(
    guard.session.user.id,
    guard.session.user.name
  );

  const buffer = Buffer.from(await file.arrayBuffer());

  // Заявленный браузером тип не является доказательством: документ потом
  // отдаётся с этим же mime, поэтому сверяем его с сигнатурой файла.
  const detected = detectMime(buffer);
  if (!detected || !matchesDeclaredMime(detected, file.type))
    return { ok: false as const, error: "bad_type" as const };

  const key = await saveDocument(profile.id, {
    buffer,
    fileName: file.name,
    // сохраняем распознанный тип, а не присланный
    mimeType: detected,
  });

  // Новый файл не проверен, поэтому полный комплект больше не собран (D27).
  // Опубликованная анкета уходит на повторную модерацию — иначе замена
  // паспорта после публикации обходила бы проверку целиком.
  const wasActive = profile.status === "active";

  /**
   * Строка документа, состояние анкеты и уведомление — в одной транзакции:
   * запись о новом файле без сброса уровня означала бы «Премиум-профиль» по
   * непроверенному паспорту, а сброшенный уровень без записи — потерянный
   * файл. Сам файл уже в хранилище: его запись откатить нельзя, поэтому
   * прежний файл удаляется только после коммита.
   */
  const replacedKey = await db.transaction(async (tx) => {
    // предыдущий файл этого шага заменяется
    const [previous] = await tx
      .select({ id: documents.id, fileKey: documents.fileKey })
      .from(documents)
      .where(
        and(eq(documents.specialistId, profile.id), eq(documents.type, step.key))
      )
      .limit(1);

    if (previous) {
      await tx
        .update(documents)
        .set({
          fileKey: key,
          fileName: file.name,
          mimeType: detected,
          fileSize: file.size,
          status: "pending",
          reviewNote: null,
          reviewedBy: null,
          reviewedAt: null,
          createdAt: new Date(),
        })
        .where(eq(documents.id, previous.id));
    } else {
      await tx.insert(documents).values({
        specialistId: profile.id,
        type: step.key,
        fileKey: key,
        fileName: file.name,
        mimeType: detected,
        fileSize: file.size,
        status: "pending",
      });
    }

    await tx
      .update(specialistProfiles)
      .set({
        verificationLevel: "unverified",
        ...(wasActive
          ? { status: "pending_review" as const, submittedAt: new Date() }
          : {}),
        /**
         * Непроверенный снимок семьям не показываем: в photo_key лежит только
         * фотография, принятая модератором. До решения в карточке стоит аватар
         * по полу — так новое фото не попадёт ни в каталог, ни в избранное, ни
         * в список открытых контактов. Сам специалист свой снимок видит:
         * кабинет и мастер читают его из документов, а не из этой колонки.
         */
        ...(step.key === "profile_photo" ? { photoKey: null } : {}),
        updatedAt: new Date(),
      })
      .where(eq(specialistProfiles.id, profile.id));

    if (wasActive) {
      await tx.insert(notifications).values({
        userId: guard.session.user.id,
        type: "verification_status",
        title: "Анкета отправлена на повторную проверку",
        body: `Вы заменили документ «${step.title}». Анкета вернётся в каталог после проверки модератором.`,
      });
    }

    return previous?.fileKey ?? null;
  });

  // после коммита: при откате прежний файл обязан остаться на месте — на него
  // всё ещё ссылается строка документа
  if (replacedKey) await removeDocument(replacedKey);

  if (wasActive) revalidateCatalog(profile.slug);

  revalidatePath("/specialist");
  // возвращаем данные, чтобы интерфейс обновился мгновенно, без перезагрузки
  return {
    ok: true as const,
    step: step.key,
    fileKey: key,
    fileName: file.name,
  };
}

export async function deleteVerificationDocument(input: unknown) {
  const guard = await requireSpecialist();
  if ("error" in guard) return { ok: false as const, error: guard.error };

  const parsed = z.object({ step: z.string() }).safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "invalid" as const };

  const profile = await ensureProfile(
    guard.session.user.id,
    guard.session.user.name
  );

  const rows = await db
    .select({ id: documents.id, fileKey: documents.fileKey })
    .from(documents)
    .where(
      and(
        eq(documents.specialistId, profile.id),
        eq(documents.type, parsed.data.step as never)
      )
    )
    .limit(1);

  if (rows[0]) {
    /**
     * Строка, уровень анкеты и ссылка на фотографию исчезают вместе.
     *
     * Уровень пересчитывается обязательно, а не только для фотографии: без
     * этого анкета сохраняла значок, который обещает семье проверку уже
     * удалённого документа. Специалист удалял принятую фотографию — в
     * каталоге оставался «Стандартный профиль» (он утверждает снимок,
     * принятый модератором), а удалив принятую справку с премиум-анкеты, он
     * оставлял «Премиум-профиль» и место в начале каталога, который сортирует
     * по этой колонке. Админское удаление (`admin-documents.ts`) считало
     * уровень с самого начала — расходиться этим двум путям нельзя.
     */
    await db.transaction(async (tx) => {
      await tx.delete(documents).where(eq(documents.id, rows[0].id));
      await tx
        .update(specialistProfiles)
        .set({
          verificationLevel: await levelForProfile(
            tx,
            profile.id,
            profile.category
          ),
          // анкета с photo_key на удалённый документ показывала бы семье
          // битую картинку
          ...(parsed.data.step === "profile_photo" ? { photoKey: null } : {}),
          updatedAt: new Date(),
        })
        .where(eq(specialistProfiles.id, profile.id));
    });
    // файл — после коммита: при откате строка снова ссылается на него
    await removeDocument(rows[0].fileKey);
  }

  revalidatePath("/specialist");
  // Файла уже нет в хранилище, а закэшированная карточка каталога минуту
  // держала бы `photo_key` на него — ровно та битая картинка, ради которой
  // столбец и обнуляется выше. Уровень анкеты тоже пересчитан, а каталог по
  // нему сортирует и рисует значок.
  if (profile.status === "active") revalidateCatalog(profile.slug);
  return { ok: true as const };
}

/* ------------------- отправка на модерацию (§8.9) ------------------ */

/**
 * «Сейчас не ищу работу» — специалист сам убирает анкету из каталога.
 *
 * Пишем в отдельную колонку `employed`, а НЕ в статус анкеты. Статус `hidden`
 * — инструмент модератора; если бы тумблер в кабинете писал туда же, специалист
 * мог бы одним нажатием отменить решение модератора и вернуть себя в каталог.
 *
 * Анкета при этом не пропадает: по прямой ссылке она открывается и честно
 * сообщает, что человек сейчас не принимает обращения. У семьи ссылка может
 * быть сохранена или отправлена знакомым, и глухая ошибка вместо страницы
 * оставила бы её в недоумении.
 *
 * Переключать имеет смысл только опубликованную анкету — черновик и анкета на
 * проверке в каталоге и так не показываются.
 */
export async function setAvailability(input: unknown) {
  const guard = await requireSpecialist();
  if ("error" in guard) return { ok: false as const, error: guard.error };

  const parsed = z.object({ available: z.boolean() }).safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "invalid" as const };

  const profile = await ensureProfile(
    guard.session.user.id,
    guard.session.user.name
  );

  if (profile.status !== "active")
    return { ok: false as const, error: "not_published" as const };

  await db
    .update(specialistProfiles)
    .set({ employed: !parsed.data.available, updatedAt: new Date() })
    .where(eq(specialistProfiles.id, profile.id));

  revalidatePath("/specialist");
  revalidateCatalog(profile.slug);

  return { ok: true as const, available: parsed.data.available };
}

export async function submitForModeration() {
  const guard = await requireSpecialist();
  if ("error" in guard) return { ok: false as const, error: guard.error };

  const profile = await ensureProfile(
    guard.session.user.id,
    guard.session.user.name
  );

  // обязательные поля анкеты
  // «Рассказ о себе» отправку не блокирует (решение владельца, 2026-09-03):
  // это самый вероятный шаг, на котором человек бросал регистрацию
  const missingFields =
    !profile.fullName ||
    profile.fullName === "Без имени" ||
    !profile.gender ||
    !profile.birthDate ||
    !profile.districtId ||
    profile.priceAmount <= 0;
  if (missingFields)
    return { ok: false as const, error: "profile_incomplete" as const };

  // загружены все ОБЯЗАТЕЛЬНЫЕ шаги категории; рекомендуемые нужны только
  // для «Премиум-профиля» и отправку не блокируют
  const uploaded = await db
    .select({ type: documents.type })
    .from(documents)
    .where(eq(documents.specialistId, profile.id));
  /**
   * Для отправки достаточно фотографии — того же минимума, что и для
   * публикации. Справки собирают неделями, и держать человека вне каталога,
   * пока он бегает по диспансерам, значит терять и его, и семьи. Остальные
   * документы он догрузит потом: с ними анкета поднимется до «Премиум-профиля».
   */
  const uploadedSet = new Set(uploaded.map((d) => d.type));
  if (!uploadedSet.has("profile_photo"))
    return {
      ok: false as const,
      error: "documents_missing" as const,
      missingSteps: ["profile_photo"],
    };

  await db
    .update(specialistProfiles)
    .set({
      status: "pending_review",
      moderationNote: null,
      submittedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(specialistProfiles.id, profile.id));

  // письмо дублирует уведомление в кабинете: человек, отправив анкету,
  // закрывает сайт и уходит ждать — в кабинет он до ответа не вернётся
  await sendProfileSubmittedEmail(
    guard.session.user.email,
    guard.session.user.name
  );

  await db.insert(notifications).values({
    userId: guard.session.user.id,
    type: "profile_submitted",
    title: "Анкета отправлена на проверку",
    body: "Модератор проверит документы и анкету — обычно это занимает 1–2 рабочих дня. Мы сообщим, когда анкета будет опубликована.",
  });

  // уведомляем администраторов, чтобы очередь модерации не простаивала
  const admins = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.role, "admin"));
  if (admins.length > 0) {
    await db.insert(notifications).values(
      admins.map((a) => ({
        userId: a.id,
        type: "system" as const,
        title: "Новая анкета на модерации",
        body: `${profile.fullName} ${profile.gender === "female" ? "отправила" : "отправил"} анкету на проверку.`,
      }))
    );
  }

  revalidatePath("/specialist");
  return { ok: true as const };
}
