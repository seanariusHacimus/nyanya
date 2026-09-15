import { and, eq, gt, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { loginAttempts } from "@/db/schema";

/**
 * Защита входа по паролю от перебора — два уровня, оба в Postgres.
 *
 * Лимит Better Auth по IP (3 запроса за 10 секунд) живёт в памяти процесса,
 * обнуляется каждой выкаткой и не защищает конкретный аккаунт от перебора с
 * многих адресов. Поэтому неудачи считаются ещё и по адресу почты:
 *
 * - **мягкий уровень — почта + IP**: 5 неверных паролей за 15 минут с одного IP
 *   закрывают вход в этот аккаунт с этого IP на 15 минут. Один злоумышленник,
 *   знающий адрес администратора, не запрёт владельца пятью запросами — с
 *   другого адреса владелец входит как обычно;
 * - **жёсткий уровень — только почта**: 30 неверных паролей за 60 минут со всех
 *   IP вместе закрывают вход в аккаунт отовсюду на 60 минут. Это потолок для
 *   ботнета: с одного IP до него не дойти — мягкий уровень пропускает с одного
 *   IP не больше 11 попыток за окно в 60 минут.
 *
 * Окно отсчитывается от первой неудачи, а когда срабатывает блокировка —
 * переносится на её конец. Поэтому ошибка вскоре после снятия блока (раньше,
 * чем пройдёт ещё одно окно) сразу блокирует снова: после срабатывания перебор
 * получает одну попытку на блок, а не новую серию. Окна фиксированные, не
 * скользящие: на стыке двух окон жёсткий уровень пропускает почти вдвое больше
 * попыток, прежде чем закрыть вход, — для перебора пароля это ничего не меняет.
 *
 * Выход для человека, которого заперли: «Забыли пароль?» (сброс по коду) или
 * вход по коду через /register — оба доказывают владение почтой и снимают все
 * счётчики адреса. Верный пароль, введённый во время блокировки, не пускает —
 * иначе блокировка ничего бы не значила.
 *
 * Существование аккаунта не раскрывается: счётчик ведётся по строке адреса, и
 * выдуманный адрес блокируется точно так же, как настоящий.
 *
 * Пороги меняются только здесь.
 */
export const LOGIN_THROTTLE = {
  perIp: { maxFailures: 5, windowMinutes: 15, lockMinutes: 15 },
  perAccount: { maxFailures: 30, windowMinutes: 60, lockMinutes: 60 },
  /** Строки, последняя неудача в которых старше этого, удаляются. */
  retentionHours: 24,
  /** Чистка идёт попутно, не чаще раза в этот интервал на процесс. */
  cleanupEveryMinutes: 10,
} as const;

/** Код ошибки 429 для формы входа — отличает блокировку от лимита по IP. */
export const TOO_MANY_LOGIN_ATTEMPTS = "TOO_MANY_LOGIN_ATTEMPTS";

type Tier = (typeof LOGIN_THROTTLE)["perIp" | "perAccount"];

/** Значение колонки ip у общего счётчика адреса. IP-адрес не содержит «*». */
const ACCOUNT_WIDE = "*";
/**
 * Ключ, когда IP клиента не определился. На проде этого не бывает (Railway
 * передаёт X-Forwarded-For), а без ключа мягкий уровень выпал бы совсем.
 */
const UNKNOWN_IP = "unknown";

/**
 * Адрес почты из тела запроса к Better Auth.
 *
 * В `hooks.before` тело ещё НЕ прошло zod-схему эндпоинта: там может оказаться
 * что угодно — массив, число, объект без email. Не упрощать до
 * `ctx.body.email.toLowerCase()`: такой запрос уронил бы хук и вход.
 * Нижний регистр — как у Better Auth при поиске пользователя, иначе «Admin@» и
 * «admin@» считались бы разными адресами одного аккаунта.
 */
export function loginEmailFromBody(body: unknown): string | null {
  if (typeof body !== "object" || body === null || !("email" in body)) return null;
  const raw = (body as { email: unknown }).email;
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  return email.length > 0 && email.length <= 320 ? email : null;
}

function ipKey(ip: string | null): string {
  return ip || UNKNOWN_IP;
}

/**
 * Сколько минут ещё закрыт вход для этого адреса с этого IP, или null.
 * Учитывает обе строки — свою пару и общий счётчик адреса. Время считает база.
 */
export async function loginLockMinutesLeft(
  email: string,
  ip: string | null,
): Promise<number | null> {
  const t = loginAttempts;
  const [row] = await db
    .select({
      minutes: sql<number | null>`ceil(extract(epoch from max(${t.lockedUntil}) - now()) / 60)::int`,
    })
    .from(t)
    .where(
      and(
        eq(t.email, email),
        inArray(t.ip, [ipKey(ip), ACCOUNT_WIDE]),
        gt(t.lockedUntil, sql`now()`),
      ),
    );
  const minutes = row?.minutes;
  return typeof minutes === "number" && minutes > 0 ? minutes : null;
}

/**
 * Одна атомарная запись на уровень: INSERT … ON CONFLICT DO UPDATE сам
 * решает, продолжается ли окно, растёт ли счётчик и не пора ли блокировать.
 * В SET все выражения видят строку ДО обновления, поэтому новое значение
 * счётчика вычисляется одним выражением и повторяется в проверке порога.
 */
async function upsertFailure(email: string, ip: string, tier: Tier) {
  const t = loginAttempts;
  const windowOver = sql`${t.windowStartedAt} <= now() - ${tier.windowMinutes}::int * interval '1 minute'`;
  const nextFailures = sql`CASE WHEN ${windowOver} THEN 1 ELSE ${t.failures} + 1 END`;
  const reachesLimit = sql`(${nextFailures}) >= ${tier.maxFailures}::int`;
  const lockEnd = sql`now() + ${tier.lockMinutes}::int * interval '1 minute'`;

  await db
    .insert(t)
    .values({ email, ip, failures: 1 })
    .onConflictDoUpdate({
      target: [t.email, t.ip],
      set: {
        failures: nextFailures,
        lockedUntil: sql`CASE WHEN ${reachesLimit} THEN ${lockEnd} WHEN ${windowOver} THEN NULL ELSE ${t.lockedUntil} END`,
        // окно после блокировки начинается с её конца — см. комментарий модуля
        windowStartedAt: sql`CASE WHEN ${reachesLimit} THEN ${lockEnd} WHEN ${windowOver} THEN now() ELSE ${t.windowStartedAt} END`,
        lastFailedAt: sql`now()`,
      },
    });
}

/**
 * Засчитать неверный пароль. Вызывается только для 401
 * INVALID_EMAIL_OR_PASSWORD: ни 403 заблокированного, ни 429, ни ошибка
 * проверки тела неудачей пароля не являются.
 */
export async function recordLoginFailure(email: string, ip: string | null) {
  await upsertFailure(email, ipKey(ip), LOGIN_THROTTLE.perIp);
  await upsertFailure(email, ACCOUNT_WIDE, LOGIN_THROTTLE.perAccount);
}

/**
 * Верный пароль снимает счётчик только своей пары «адрес + IP».
 *
 * Общий счётчик адреса не сбрасывается: во время блокировки по нему войти
 * паролем нельзя вовсе, а вне блокировки сброс при каждом входе владельца
 * дарил бы ботнету свежие 30 попыток. Ошибки самого владельца до этого
 * потолка не дорастают и истекают вместе с окном.
 */
export async function clearLoginFailuresForIp(email: string, ip: string | null) {
  await db
    .delete(loginAttempts)
    .where(and(eq(loginAttempts.email, email), eq(loginAttempts.ip, ipKey(ip))));
}

/**
 * Владение почтой доказано кодом (сброс пароля или вход по коду) — все
 * счётчики адреса снимаются, включая общий.
 */
export async function clearAllLoginFailures(email: string) {
  await db.delete(loginAttempts).where(eq(loginAttempts.email, email));
}

let lastCleanupAt = 0;

/**
 * Удалить строки, последняя неудача в которых старше суток. Попутно, не чаще
 * раза в `cleanupEveryMinutes` на процесс и без ожидания: вход не должен
 * ждать уборки. Активную блокировку это не задевает — она кончается не позже
 * чем через час после последней неудачи.
 */
export function sweepOldLoginAttempts() {
  const now = Date.now();
  if (now - lastCleanupAt < LOGIN_THROTTLE.cleanupEveryMinutes * 60_000) return;
  lastCleanupAt = now;
  db.delete(loginAttempts)
    .where(
      lt(
        loginAttempts.lastFailedAt,
        sql`now() - ${LOGIN_THROTTLE.retentionHours}::int * interval '1 hour'`,
      ),
    )
    .then(
      () => undefined,
      (error: unknown) => console.error("[login-throttle] cleanup failed", error),
    );
}
