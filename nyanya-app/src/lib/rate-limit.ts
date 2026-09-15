import { lt, sql } from "drizzle-orm";
import { db } from "@/db";
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
