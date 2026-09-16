/**
 * Проверка живости приложения: один дешёвый запрос к базе.
 *
 * Кто её зовёт:
 * - Railway при каждом деплое (`healthcheckPath` в railway.json). Трафик
 *   переключается на новый релиз только после ответа 2xx, поэтому контейнер,
 *   который стартовал, но базы не видит, до посетителей не доходит — старый
 *   релиз продолжает обслуживать запросы. После деплоя Railway этот адрес
 *   больше не опрашивает (это записано в их документации), непрерывного
 *   мониторинга у платформы нет.
 * - внешний монитор доступности — он и должен заметить падение;
 *   его заводит владелец, см. ../../../../../docs/operations/railway-runbook.md.
 *
 * Правила этого маршрута:
 * - без сессии и без ролей: монитор и Railway ходят сюда без куки;
 * - ничего не пишет и не читает сверх `select 1` — проверка не должна сама
 *   создавать нагрузку;
 * - наружу уходят только три поля (`status`, `db`, `ms`). Ни текста ошибки,
 *   ни адреса базы, ни имён переменных: адрес публичный, отвечает всем.
 *   Подробности ошибки идут в лог сервиса через console.error;
 * - `Cache-Control: no-store` — ответ ни в коем случае не должен
 *   переиспользоваться: устаревшее «ok» хуже отсутствия проверки.
 *   Заголовки из next.config.ts (`headers()`) этот ключ не задают, поэтому
 *   значение хендлера доходит до ответа; `src/proxy.ts` матчит только
 *   /account, /specialist и /admin — редирект на /login сюда не попадает.
 */
import { sql } from "drizzle-orm";

import { db } from "@/db";

export const dynamic = "force-dynamic";

/**
 * Больше этого проверка базу не ждёт. Смысл таймаута: повисшая (а не упавшая)
 * база не должна подвешивать и сам ответ — иначе монитор получит таймаут
 * запроса вместо внятного 503, а деплой будет висеть до healthcheckTimeout.
 * Сам запрос при этом продолжает выполняться и освобождает соединение пула
 * сам — гонку выигрывает таймер, а не отмена запроса.
 */
const DB_TIMEOUT_MS = 3_000;

const NO_STORE = { "Cache-Control": "no-store" };

async function dbAlive(): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      db.execute(sql`select 1`),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error(`db timeout ${DB_TIMEOUT_MS}ms`)),
          DB_TIMEOUT_MS,
        );
      }),
    ]);
    return true;
  } catch (error) {
    // в лог сервиса (Railway), не в тело ответа
    console.error("[health] база недоступна", error);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function probe() {
  const startedAt = Date.now();
  const ok = await dbAlive();
  return {
    ok,
    body: {
      status: ok ? "ok" : "error",
      db: ok ? "ok" : "error",
      ms: Date.now() - startedAt,
    },
  };
}

export async function GET() {
  const { ok, body } = await probe();
  return Response.json(body, { status: ok ? 200 : 503, headers: NO_STORE });
}

/** Часть мониторов проверяет адрес методом HEAD; без этого Next ответил бы 405. */
export async function HEAD() {
  const { ok } = await probe();
  return new Response(null, { status: ok ? 200 : 503, headers: NO_STORE });
}
