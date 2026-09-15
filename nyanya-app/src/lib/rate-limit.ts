import { eq, lt, sql } from "drizzle-orm";
import type { BetterAuthRateLimitOptions } from "better-auth";
import { db } from "@/db";
import { rateLimit } from "@/db/auth-schema";
import { appRateLimits } from "@/db/schema";
import { describeThrottleError } from "@/lib/login-throttle";

/**
 * Ограничение частоты для собственных маршрутов — счётчики в Postgres
 * (`app_rate_limits`), а не в памяти процесса: деплой их не обнуляет, а второй
 * экземпляр приложения не умножает предел.
 *
 * Окно фиксированное: первый запрос открывает его на `windowSeconds`, каждый
 * следующий прибавляет единицу, истёкшее окно начинается заново. Отклонённые
 * запросы тоже считаются — окно от этого не продлевается. Лимиты Better Auth
 * (вход, коды, сброс пароля) живут в своей таблице `rate_limit`, не здесь.
 */
export type RateLimitRule = { max: number; windowSeconds: number };

export type RateLimitResult = {
  allowed: boolean;
  /** Сколько секунд осталось до конца окна (не меньше 1). */
  retryAfterSeconds: number;
};

/**
 * Атомарный шаг «посчитать и проверить» для ключа.
 *
 * Один `INSERT … ON CONFLICT DO UPDATE`: одновременные запросы не могут
 * проскочить мимо счётчика. Всё время считает база (`now()`), чтобы часы
 * разных экземпляров не спорили. Ошибка базы пробрасывается — что делать при
 * сбое, решает маршрут.
 */
export async function consumeRateLimit(
  key: string,
  rule: RateLimitRule,
): Promise<RateLimitResult> {
  sweepExpiredRateLimits();
  const t = appRateLimits;
  const windowOver = sql`${t.expiresAt} <= now()`;
  const windowEnd = sql`now() + ${rule.windowSeconds}::int * interval '1 second'`;

  const [row] = await db
    .insert(t)
    .values({ key, count: 1, expiresAt: windowEnd })
    .onConflictDoUpdate({
      target: t.key,
      set: {
        count: sql`CASE WHEN ${windowOver} THEN 1 ELSE ${t.count} + 1 END`,
        expiresAt: sql`CASE WHEN ${windowOver} THEN ${windowEnd} ELSE ${t.expiresAt} END`,
      },
    })
    .returning({
      count: t.count,
      retryAfterSeconds: sql<number>`greatest(1, ceil(extract(epoch from ${t.expiresAt} - now())))::int`,
    });

  return {
    allowed: row.count <= rule.max,
    retryAfterSeconds: Number(row.retryAfterSeconds),
  };
}

/** Чистка идёт попутно, не чаще раза в этот интервал на процесс. */
const SWEEP_EVERY_MS = 10 * 60_000;
let lastSweepAt = 0;

/**
 * Удалить истёкшие окна. Истёкшая строка ведёт себя как отсутствующая, так что
 * удалять можно сразу; ключ содержит IP, и держать его дольше незачем. Без
 * ожидания и не чаще раза в 10 минут на процесс — строка может пережить своё
 * окно до следующего запроса, который запустит чистку.
 */
function sweepExpiredRateLimits() {
  const now = Date.now();
  if (now - lastSweepAt < SWEEP_EVERY_MS) return;
  lastSweepAt = now;
  db.delete(appRateLimits)
    .where(lt(appRateLimits.expiresAt, sql`now()`))
    .then(
      () => undefined,
      // без параметров запроса: в них лежит ключ с IP
      (error: unknown) => console.error("[rate-limit] cleanup failed", describeThrottleError(error)),
    );
}

type AuthRateLimitStorage = NonNullable<BetterAuthRateLimitOptions["customStorage"]>;

/**
 * Хранилище счётчиков лимитов Better Auth (`rateLimit.customStorage` в
 * `lib/auth.ts`) — таблица `rate_limit`, ключ `<ip>|<путь>`.
 *
 * Почему не штатное `storage: "database"`: его «атомарный» шаг — это чтение
 * строки и потом `UPDATE … WHERE id IN (SELECT … AND count < max LIMIT 1)`.
 * Подзапрос в Postgres видит снимок до чужого обновления, поэтому одновременные
 * запросы с одного IP проходят все, пока не упрутся в блокировку строки
 * (проверено локально 2026-09-16: из 60 одновременных отправок кода на
 * 3 в минуту проходило 8–10, из 100 входов на 3 за 10 секунд — до 11). Лимит в
 * памяти, который был до переезда в базу, проверял и считал одним синхронным
 * шагом, и обогнать его так было нельзя.
 *
 * Правила и их смысл — ровно как у Better Auth: окно отсчитывается от
 * последнего пропущенного запроса (`lastRequest`), пока оно не истекло — не
 * больше `max`, отклонённый запрос окно не продлевает, `retryAfter` — секунды до
 * конца окна. Разница только в том, что шаг — один
 * `INSERT … ON CONFLICT DO UPDATE`: Postgres блокирует строку и считает новое
 * значение от последней версии, так что проскочить мимо счётчика нельзя.
 * Отклонённый запрос поднимает `count` до `max + 1` (не выше) — по этому числу
 * и видно, что запрос отклонён. Время — `now()` базы в миллисекундах.
 */
export const authRateLimitStorage: AuthRateLimitStorage = {
  async consume(key, rule) {
    sweepIdleAuthRateLimits();
    const t = rateLimit;
    const windowMs = rule.window * 1000;
    const nowMs = sql`(extract(epoch from now()) * 1000)::bigint`;
    // excluded.last_request — это nowMs из VALUES, t.* — строка, лежащая в базе
    const windowOver = sql`excluded.last_request - ${t.lastRequest} > ${windowMs}::bigint`;

    let row: { count: number; retryAfterSeconds: number } | undefined;
    try {
      [row] = await db
        .insert(t)
        .values({ id: crypto.randomUUID(), key, count: 1, lastRequest: nowMs })
        .onConflictDoUpdate({
          target: t.key,
          set: {
            count: sql`CASE WHEN ${windowOver} THEN 1 ELSE least(${t.count} + 1, ${rule.max + 1}::int) END`,
            lastRequest: sql`CASE WHEN ${windowOver} OR ${t.count} < ${rule.max}::int THEN excluded.last_request ELSE ${t.lastRequest} END`,
          },
        })
        .returning({
          count: t.count,
          retryAfterSeconds: sql<number>`greatest(1, ceil((${t.lastRequest} + ${windowMs}::bigint - ${nowMs}) / 1000.0))::int`,
        });
    } catch (error) {
      // текст ошибки Drizzle содержит параметры запроса, то есть ключ с IP, —
      // наружу (в журнал Better Auth) уходит только причина от драйвера
      throw new Error(`[rate-limit] auth counter failed: ${describeThrottleError(error)}`);
    }
    if (!row) throw new Error("[rate-limit] auth counter returned no row");

    return row.count <= rule.max
      ? { allowed: true, retryAfter: null }
      : { allowed: false, retryAfter: Number(row.retryAfterSeconds) };
  },

  // get/set Better Auth зовёт только для хранилищ без consume; обязательны по типу
  async get(key) {
    const [row] = await db
      .select({ key: rateLimit.key, count: rateLimit.count, lastRequest: rateLimit.lastRequest })
      .from(rateLimit)
      .where(eq(rateLimit.key, key));
    return row ?? null;
  },
  async set(key, value) {
    await db
      .insert(rateLimit)
      .values({ id: crypto.randomUUID(), key, count: value.count, lastRequest: value.lastRequest })
      .onConflictDoUpdate({
        target: rateLimit.key,
        set: { count: value.count, lastRequest: value.lastRequest },
      });
  },
};

/**
 * Строка `rate_limit` без запросов дольше этого срока удаляется. Самое длинное
 * окно правил Better Auth — 60 секунд, после него строка ведёт себя как
 * отсутствующая; десять минут — с запасом на случай нового правила подлиннее.
 */
const AUTH_ROW_IDLE_MS = 10 * 60_000;
let lastAuthSweepAt = 0;

/** Попутная чистка `rate_limit`, не чаще раза в 10 минут на процесс, без ожидания. */
function sweepIdleAuthRateLimits() {
  const now = Date.now();
  if (now - lastAuthSweepAt < SWEEP_EVERY_MS) return;
  lastAuthSweepAt = now;
  db.delete(rateLimit)
    .where(
      lt(
        rateLimit.lastRequest,
        sql`(extract(epoch from now()) * 1000)::bigint - ${AUTH_ROW_IDLE_MS}::bigint`,
      ),
    )
    .then(
      () => undefined,
      (error: unknown) =>
        console.error("[rate-limit] auth cleanup failed", describeThrottleError(error)),
    );
}
