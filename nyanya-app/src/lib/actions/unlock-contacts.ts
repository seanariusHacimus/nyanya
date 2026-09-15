"use server";

import { z } from "zod";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  specialistProfiles,
  contactUnlocks,
  notifications,
  user,
} from "@/db/schema";
import { buildContacts, pluralRu } from "@/lib/specialists-shared";
import { decideUnlock, parseUnlockLimits } from "@/lib/unlock-limits";
import { describeThrottleError } from "@/lib/login-throttle";

const schema = z.object({ slug: z.string().trim().min(1).max(120) });

/**
 * Открытие контактов — бесплатно, но только после входа (решение владельца).
 *
 * Оплата за контакты была введена 2026-08-03 и отменена 2026-08-08: сервис
 * остаётся полностью бесплатным для зарегистрированных. Запись в
 * `contact_unlocks` сохраняется — по ней считается воронка, лимит и уходит
 * уведомление специалисту; поле `payment_id` остаётся пустым.
 *
 * Идемпотентно: повторный вызов по уже открытой анкете возвращает контакты
 * без новой записи и без проверки лимитов.
 *
 * **Лимиты** (2026-09-16, `lib/unlock-limits.ts`): не больше `dailyCap` новых
 * контактов за скользящие 24 часа и не чаще одного нового открытия в
 * `minIntervalSec` секунд. Касаются всех ролей, кроме admin. Проверка и
 * вставка идут в одной транзакции под advisory-блокировкой на аккаунт:
 * без неё пачка одновременных запросов видела бы один и тот же счёт и
 * проходила вся — и мимо паузы, и мимо суточного лимита.
 *
 * Блокировка берётся через `pg_try_advisory_xact_lock` и НЕ ждёт: запрос,
 * пришедший, пока другой запрос того же аккаунта проверяет и вставляет,
 * сразу получает `too_fast`. Ожидающая блокировку транзакция держала бы
 * соединение из пула (max 10), и пачка из сотен одновременных запросов
 * одного аккаунта выстраивалась бы в очередь по одному, занимая весь пул:
 * проверено локально 2026-09-16 с задержкой до базы 2 мс — 300 запросов шли
 * 9,7 с, и всё это время чужая страница анкеты не открывалась. Браузер
 * отправляет действия одного клиента по очереди, так что одновременные
 * запросы — это скрипт или несколько вкладок. Уже открытый контакт
 * проверяется до блокировки, поэтому в нём такой отказ не случается.
 *
 * Аккаунт, исчерпавший лимит, получает отметку `user.flagged_at` и попадает в
 * блок «Подозрительная активность» на обзоре админки; администраторам уходит
 * уведомление. Блокировки нет — решает человек.
 */
export async function unlockContacts(input: unknown) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "invalid" as const };

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false as const, error: "unauthorized" as const };

  const rows = await db
    .select({
      id: specialistProfiles.id,
      fullName: specialistProfiles.fullName,
      ownerId: specialistProfiles.userId,
      ownerPhone: user.phone,
    })
    .from(specialistProfiles)
    .innerJoin(user, eq(user.id, specialistProfiles.userId))
    .where(
      and(
        eq(specialistProfiles.slug, parsed.data.slug),
        eq(specialistProfiles.status, "active")
      )
    )
    .limit(1);

  const specialist = rows[0];
  if (!specialist) return { ok: false as const, error: "not_found" as const };
  if (!specialist.ownerPhone)
    return { ok: false as const, error: "no_contacts" as const };

  const parentId = session.user.id;
  const contacts = buildContacts(specialist.ownerPhone);
  const values = { parentId, specialistId: specialist.id };

  let inserted = false;
  /** Сколько новых контактов аккаунт открыл за 24 часа, если это открытие исчерпало лимит. */
  let reachedCapAt: number | null = null;

  if (session.user.role === "admin") {
    // администратор лимитом не ограничен
    const added = await db
      .insert(contactUnlocks)
      .values(values)
      .onConflictDoNothing()
      .returning({ id: contactUnlocks.id });
    inserted = added.length > 0;
  } else {
    const limits = parseUnlockLimits(process.env);
    const alreadyOpened = and(
      eq(contactUnlocks.parentId, parentId),
      eq(contactUnlocks.specialistId, specialist.id)
    );
    // уже открытое не считается и не блокируется — проверка до лимитов и до
    // блокировки: занятая блокировка не должна отказать в открытом контакте
    const existing = await db
      .select({ id: contactUnlocks.id })
      .from(contactUnlocks)
      .where(alreadyOpened)
      .limit(1);
    if (existing.length > 0) return { ok: true as const, contacts };

    const outcome = await db.transaction(async (tx) => {
      // один запрос аккаунта за раз; другие аккаунты не ждут. Не ждём и мы:
      // занято — значит, этот же аккаунт прямо сейчас открывает контакт
      const [lock] = await tx.execute<{ locked: boolean }>(
        sql`select pg_try_advisory_xact_lock(hashtextextended(${`contact-unlock:${parentId}`}, 0)) as locked`
      );
      if (!lock?.locked) {
        return {
          kind: "too_fast" as const,
          retryAfterSec: Math.max(1, limits.minIntervalSec),
        };
      }

      // пока мы шли к блокировке, этот контакт мог открыть параллельный запрос
      const openedMeanwhile = await tx
        .select({ id: contactUnlocks.id })
        .from(contactUnlocks)
        .where(alreadyOpened)
        .limit(1);
      if (openedMeanwhile.length > 0) return { kind: "already" as const };

      // время — только из базы, которая сама пишет unlocked_at. Не now(): оно
      // заморожено на начале транзакции, а между её началом и блокировкой
      // другой запрос того же аккаунта мог успеть вставить более позднюю
      // запись, — «с последнего открытия» вышло бы меньше нуля
      const inWindow = and(
        eq(contactUnlocks.parentId, parentId),
        sql`${contactUnlocks.unlockedAt} > clock_timestamp() - interval '24 hours'`
      );
      const [usage] = await tx
        .select({
          opened24h: sql<number>`count(*)::int`,
          secondsSinceLast: sql<number | null>`extract(epoch from (clock_timestamp() - max(${contactUnlocks.unlockedAt})))::float8`,
        })
        .from(contactUnlocks)
        .where(inWindow);
      const opened24h = usage?.opened24h ?? 0;
      const decision = decideUnlock(
        { opened24h, secondsSinceLast: usage?.secondsSinceLast ?? null },
        limits
      );

      if (!decision.allowed) {
        if (decision.reason === "too_fast") {
          return { kind: "too_fast" as const, retryAfterSec: decision.retryAfterSec };
        }
        // новое открытие станет доступно, когда из окна выйдет столько старых
        // записей, чтобы в нём осталось dailyCap - 1
        const [freed] = await tx
          .select({
            seconds: sql<number>`extract(epoch from (${contactUnlocks.unlockedAt} + interval '24 hours' - clock_timestamp()))::float8`,
          })
          .from(contactUnlocks)
          .where(inWindow)
          .orderBy(asc(contactUnlocks.unlockedAt))
          .offset(opened24h - limits.dailyCap)
          .limit(1);
        return {
          kind: "daily_limit" as const,
          opened24h,
          retryAfterSec: Math.max(1, Math.ceil(freed?.seconds ?? 1)),
        };
      }

      const added = await tx
        .insert(contactUnlocks)
        .values(values)
        .onConflictDoNothing()
        .returning({ id: contactUnlocks.id });
      return {
        kind: "opened" as const,
        inserted: added.length > 0,
        reachedCapAt: added.length > 0 && decision.reachesCap ? opened24h + 1 : null,
      };
    });

    if (outcome.kind === "too_fast") {
      return {
        ok: false as const,
        error: "too_fast" as const,
        retryAfterSec: outcome.retryAfterSec,
      };
    }
    if (outcome.kind === "daily_limit") {
      await flagForReview(parentId, outcome.opened24h);
      return {
        ok: false as const,
        error: "daily_limit" as const,
        cap: limits.dailyCap,
        retryAfterSec: outcome.retryAfterSec,
      };
    }
    if (outcome.kind === "opened") {
      inserted = outcome.inserted;
      reachedCapAt = outcome.reachedCapAt;
    }
  }

  // события только при первом открытии
  if (inserted) {
    await db
      .update(specialistProfiles)
      .set({ unlockCount: sql`${specialistProfiles.unlockCount} + 1` })
      .where(eq(specialistProfiles.id, specialist.id));
    await db.insert(notifications).values({
      userId: specialist.ownerId,
      type: "contact_unlocked",
      title: "Ваши контакты открыли",
      body: "Семья открыла ваши контакты в каталоге — возможно, вам скоро напишут.",
    });
  }

  // семья получает и этот контакт; администратор узнаёт об аккаунте сразу, а
  // не только когда тот попробует открыть следующий
  if (reachedCapAt !== null) await flagForReview(parentId, reachedCapAt);

  return { ok: true as const, contacts };
}

/**
 * Отметка для ручного разбора и уведомление администраторам.
 *
 * `WHERE flagged_at IS NULL`: пока отметка стоит, повторные упирания в лимит
 * не плодят уведомлений; после «Разобрано» следующее упирание отмечает и
 * уведомляет заново. Отметка и уведомления — в одной транзакции, чтобы сбой
 * вставки не оставил отметку без уведомления.
 *
 * Никогда не бросает: сбой здесь не должен подменять семье честное сообщение
 * о лимите (или уже открытый контакт) общей ошибкой. В журнал — только
 * причина от драйвера: текст ошибки Drizzle несёт параметры запроса, а среди
 * них адрес почты.
 */
async function flagForReview(userId: string, opened24h: number) {
  try {
    await db.transaction(async (tx) => {
      const flagged = await tx
        .update(user)
        .set({
          flaggedAt: sql`now()`,
          flagReason: `Лимит открытий контактов: за 24 часа открыто ${opened24h}`,
        })
        .where(and(eq(user.id, userId), isNull(user.flaggedAt)))
        .returning({ email: user.email });
      if (flagged.length === 0) return;

      const admins = await tx
        .select({ id: user.id })
        .from(user)
        .where(eq(user.role, "admin"));
      if (admins.length === 0) return;

      await tx.insert(notifications).values(
        admins.map((a) => ({
          userId: a.id,
          type: "system" as const,
          title: "Аккаунт исчерпал лимит открытий контактов",
          body: `${flagged[0].email} открыл(а) ${opened24h} ${pluralRu(opened24h, "новый контакт", "новых контакта", "новых контактов")} за 24 часа. Разберите на обзоре админ-панели, в блоке «Подозрительная активность»: там кнопки «Разобрано» и «Заблокировать».`,
        }))
      );
    });
  } catch (error) {
    console.error("[contact-limits] flag failed:", describeThrottleError(error));
  }
}
