/**
 * Гигиена базы: удаление строк, которые никому больше не нужны.
 *
 * Better Auth удаляет истёкшую сессию только когда её предъявили, а код
 * подтверждения — когда им воспользовались; счётчики частоты и неудачных
 * входов чистятся попутной уборкой приложения, которая случается не чаще раза
 * в десять минут на процесс и только если в приложение кто-то пришёл. Брошенные
 * строки копятся, и в них лежат адреса почты и IP.
 *
 * По умолчанию — сухой прогон: скрипт только считает. Удаляет с `--apply`.
 * Идемпотентен: второй запуск подряд находит ноль строк.
 *
 *   node scripts/db-cleanup.mjs              # посчитать
 *   node scripts/db-cleanup.mjs --apply      # удалить
 *
 * На Railway — как и db-migrate.mjs: внутри деплоя берётся DATABASE_URL,
 * снаружи предпочитается DATABASE_PUBLIC_URL (адрес *.railway.internal снаружи
 * недоступен). Запускать на проде только по решению владельца: сначала сухой
 * прогон и показать цифры.
 */
import postgres from "postgres";

/** Прочитанные уведомления старше этого срока (непрочитанные не трогаем никогда). */
const NOTIFICATION_DAYS = 90;
/** Сессии и коды подтверждения — через столько суток после истечения. */
const EXPIRED_GRACE_DAYS = 1;
/** Неудачные входы: столько же, сколько хранит сама защита от перебора (LOGIN_THROTTLE.retentionHours). */
const LOGIN_ATTEMPT_HOURS = 24;
/** Счётчики лимитов Better Auth: строка без запросов дольше этого срока (AUTH_ROW_IDLE_MS в lib/rate-limit.ts). */
const AUTH_RATE_LIMIT_IDLE_MINUTES = 10;

const apply = process.argv.includes("--apply");

const onRailwayDeploy = Boolean(process.env.RAILWAY_DEPLOYMENT_ID);
const url = onRailwayDeploy
  ? process.env.DATABASE_URL
  : process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;

if (!url) {
  console.error("db-cleanup: DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(url, { max: 1, connect_timeout: 20, onnotice: () => {} });

/**
 * Что удаляем. Условие — фрагмент SQL, он же считает и он же удаляет: разойтись
 * они не могут. Сроки заданы с запасом, поэтому разница часовых поясов между
 * «timestamp без зоны» в таблицах и now() значения не имеет.
 */
const targets = [
  {
    table: "notifications",
    what: `прочитанные уведомления старше ${NOTIFICATION_DAYS} дней`,
    where: sql`read_at is not null and created_at < now() - ${`${NOTIFICATION_DAYS} days`}::interval`,
  },
  {
    table: "session",
    what: `сессии, истёкшие больше ${EXPIRED_GRACE_DAYS} суток назад`,
    where: sql`expires_at < now() - ${`${EXPIRED_GRACE_DAYS} days`}::interval`,
  },
  {
    table: "verification",
    what: `коды подтверждения, истёкшие больше ${EXPIRED_GRACE_DAYS} суток назад`,
    where: sql`expires_at < now() - ${`${EXPIRED_GRACE_DAYS} days`}::interval`,
  },
  {
    table: "login_attempts",
    what: `неудачные входы старше ${LOGIN_ATTEMPT_HOURS} часов`,
    where: sql`last_failed_at < now() - ${`${LOGIN_ATTEMPT_HOURS} hours`}::interval`,
  },
  {
    table: "rate_limit",
    what: `счётчики Better Auth без запросов дольше ${AUTH_RATE_LIMIT_IDLE_MINUTES} минут`,
    where: sql`last_request < (extract(epoch from now()) * 1000)::bigint - ${
      AUTH_RATE_LIMIT_IDLE_MINUTES * 60 * 1000
    }::bigint`,
  },
  {
    table: "app_rate_limits",
    what: "истёкшие окна собственных лимитов",
    where: sql`expires_at < now()`,
  },
];

const count = (table, where) =>
  sql`select count(*)::int as n from ${sql(table)} where ${where}`.then(
    ([row]) => row.n,
  );
const total = (table) =>
  sql`select count(*)::int as n from ${sql(table)}`.then(([row]) => row.n);

try {
  console.log(
    apply
      ? "db-cleanup: удаление (--apply)"
      : "db-cleanup: сухой прогон, ничего не удаляется (--apply — удалить)",
  );
  for (const target of targets) {
    const before = await total(target.table);
    const stale = await count(target.table, target.where);
    if (apply && stale > 0) {
      await sql`delete from ${sql(target.table)} where ${target.where}`;
    }
    const after = await total(target.table);
    console.log(
      `db-cleanup: ${target.table}: ${target.what} — ${stale}; строк было ${before}, стало ${after}`,
    );
  }
} finally {
  await sql.end();
}
