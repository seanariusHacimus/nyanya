/**
 * Лимиты на открытие контактов (решение владельца, 2026-09-16).
 *
 * Открытие бесплатное, но не безлимитное: без ограничения один
 * зарегистрированный аккаунт выгружал телефоны всех специалистов за минуты.
 *
 * - **суточный лимит** — не больше `dailyCap` НОВЫХ контактов за скользящие
 *   24 часа (по умолчанию 20). Окно — не переменная: оно записано в SQL как
 *   `interval '24 hours'` в действии и в админском запросе;
 * - **пауза** — не меньше `minIntervalSec` секунд между двумя новыми
 *   открытиями (по умолчанию 3).
 *
 * Уже открытый контакт не считается и никогда не блокируется. Администратор
 * лимитом не ограничен. Проверка и запись — в `lib/actions/unlock-contacts.ts`.
 *
 * Модуль чистый — без базы, без `process.env` и без импортов: его читает и
 * серверное действие, и клиентская панель (текст про ожидание), и тест
 * `unlock-limits.test.mjs`.
 */

export type UnlockLimits = {
  /** Сколько новых контактов можно открыть за скользящие 24 часа. */
  dailyCap: number;
  /** Сколько секунд должно пройти после предыдущего нового открытия. 0 — без паузы. */
  minIntervalSec: number;
};

export const UNLOCK_LIMIT_DEFAULTS: UnlockLimits = {
  dailyCap: 20,
  minIntervalSec: 3,
};

function parseWhole(raw: string | undefined): number | null {
  const value = raw?.trim();
  if (!value || !/^\d+$/.test(value)) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : null;
}

/**
 * Значения из переменных `CONTACT_UNLOCK_DAILY_CAP` и
 * `CONTACT_UNLOCK_MIN_INTERVAL_SEC`. Пустое значение, не целое число или
 * лимит 0 — берётся значение по умолчанию (лимит 0 закрыл бы контакты всем).
 */
export function parseUnlockLimits(
  env: Record<string, string | undefined>
): UnlockLimits {
  const cap = parseWhole(env.CONTACT_UNLOCK_DAILY_CAP);
  const interval = parseWhole(env.CONTACT_UNLOCK_MIN_INTERVAL_SEC);
  return {
    dailyCap: cap !== null && cap >= 1 ? cap : UNLOCK_LIMIT_DEFAULTS.dailyCap,
    minIntervalSec: interval ?? UNLOCK_LIMIT_DEFAULTS.minIntervalSec,
  };
}

export type UnlockUsage = {
  /** Новых открытий за последние 24 часа. */
  opened24h: number;
  /** Секунд с последнего нового открытия в окне; null — открытий в окне нет. */
  secondsSinceLast: number | null;
};

export type UnlockDecision =
  | { allowed: true; /** это открытие исчерпает лимит */ reachesCap: boolean }
  | { allowed: false; reason: "daily_limit" }
  | { allowed: false; reason: "too_fast"; retryAfterSec: number };

/**
 * Можно ли открыть ещё один новый контакт. Суточный лимит проверяется
 * первым: упёршемуся в него важнее узнать, когда откроются новые, чем про
 * секундную паузу.
 */
export function decideUnlock(usage: UnlockUsage, limits: UnlockLimits): UnlockDecision {
  if (usage.opened24h >= limits.dailyCap) {
    return { allowed: false, reason: "daily_limit" };
  }
  if (usage.secondsSinceLast !== null) {
    // отрицательное значение возможно только из-за разницы часов — считаем нулём
    const since = Math.max(0, usage.secondsSinceLast);
    if (since < limits.minIntervalSec) {
      return {
        allowed: false,
        reason: "too_fast",
        retryAfterSec: Math.max(1, Math.ceil(limits.minIntervalSec - since)),
      };
    }
  }
  return { allowed: true, reachesCap: usage.opened24h + 1 >= limits.dailyCap };
}

/**
 * «через 5 ч 12 мин», «через 40 мин», «через 3 с». Округление всегда вверх:
 * к названному сроку новое открытие точно будет доступно, раньше — нет.
 */
export function formatRetryAfter(seconds: number): string {
  const s = Math.max(1, Math.ceil(seconds));
  if (s < 60) return `через ${s} с`;
  const totalMinutes = Math.ceil(s / 60);
  if (totalMinutes < 60) return `через ${totalMinutes} мин`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `через ${hours} ч` : `через ${hours} ч ${minutes} мин`;
}
