/**
 * Правила отзывов (решение владельца, 2026-09-16).
 *
 * Отзыв о специалисте оставляет только тот, кто открыл его контакты. Открытие
 * бесплатное, поэтому само по себе ничего не стоит второму аккаунту,
 * заведённому ради пятёрки себе или единицы конкуренту. Правила ниже поднимают
 * цену такой накрутки, а новый и изменённый отзыв всё равно ждёт модератора
 * (`pending`) и семьям не виден до публикации:
 *
 * - аккаунту автора не меньше `minAccountAgeHours` часов;
 * - с открытия контактов этого специалиста прошло не меньше `minUnlockAgeHours` часов;
 * - не больше `dailyNewReviewsCap` НОВЫХ отзывов от аккаунта за скользящие 24 часа.
 *   Правка своего отзыва под лимит не попадает. Окно — не число здесь, а
 *   `interval '24 hours'` в `lib/review-eligibility.ts`.
 *
 * 0 выключает правило. Числа меняются коммитом, а не переменной окружения.
 *
 * Модуль чистый — без базы и без импортов: его читает серверное действие,
 * страница анкеты, клиентская форма и тест `review-policy.test.mjs`. Факты для
 * решения собирает `lib/review-eligibility.ts`.
 */

export type ReviewPolicy = {
  /** Сколько часов должно пройти с регистрации автора. 0 — правило выключено. */
  minAccountAgeHours: number;
  /** Сколько часов должно пройти с открытия контактов этого специалиста. 0 — выключено. */
  minUnlockAgeHours: number;
  /** Сколько новых отзывов аккаунт может оставить за 24 часа. 0 — выключено. */
  dailyNewReviewsCap: number;
};

export const REVIEW_POLICY: ReviewPolicy = {
  minAccountAgeHours: 24,
  minUnlockAgeHours: 24,
  dailyNewReviewsCap: 3,
};

export type ReviewStatus = "pending" | "visible" | "hidden";

export type ReviewDenial =
  | "own_profile"
  | "not_unlocked"
  | "hidden_by_moderator"
  | "account_too_new"
  | "unlock_too_new"
  | "daily_cap";

export type ReviewFacts = {
  /** Анкета принадлежит самому автору. */
  isOwnProfile: boolean;
  /** Секунд с регистрации аккаунта; null — аккаунт не найден. */
  accountAgeSec: number | null;
  /** Секунд с открытия контактов этого специалиста; null — контакты не открывались. */
  unlockAgeSec: number | null;
  /** Статус своего отзыва об этом специалисте; null — отзыва ещё нет. */
  ownStatus: ReviewStatus | null;
  /**
   * Новые отзывы аккаунта за последние 24 часа, от самого старого: для каждого —
   * через сколько секунд он выйдет из окна. Длина массива — число новых отзывов.
   */
  windowSecondsLeft: number[];
};

export type ReviewDecision =
  | { allowed: true; ownStatus: ReviewStatus | null }
  | { allowed: false; reason: ReviewDenial; retryAfterSec: number | null };

function waitSeconds(hours: number, ageSec: number | null): number {
  if (hours <= 0) return 0;
  // отрицательный возраст возможен только из-за разницы часов — считаем нулём
  const age = Math.max(0, ageSec ?? 0);
  return Math.max(0, Math.ceil(hours * 3600 - age));
}

/**
 * Можно ли сохранить отзыв. Порядок важен: сначала то, что не пройдёт никогда
 * (своя анкета, отзыв скрыт модератором, контакты не открыты), затем то, что
 * пройдёт со временем. Из двух сроков называется больший: названное время —
 * то, когда отзыв действительно примут.
 */
export function decideReview(
  facts: ReviewFacts,
  policy: ReviewPolicy = REVIEW_POLICY
): ReviewDecision {
  const deny = (reason: ReviewDenial, retryAfterSec: number | null = null) =>
    ({ allowed: false, reason, retryAfterSec }) as const;

  if (facts.isOwnProfile) return deny("own_profile");
  // скрытый отзыв не правится: иначе каждое сохранение возвращало бы его в очередь
  if (facts.ownStatus === "hidden") return deny("hidden_by_moderator");
  if (facts.unlockAgeSec === null) return deny("not_unlocked");

  const accountWait = waitSeconds(policy.minAccountAgeHours, facts.accountAgeSec);
  const unlockWait = waitSeconds(policy.minUnlockAgeHours, facts.unlockAgeSec);
  if (accountWait > 0 || unlockWait > 0) {
    return unlockWait >= accountWait
      ? deny("unlock_too_new", unlockWait)
      : deny("account_too_new", accountWait);
  }

  // лимит — только на новые отзывы: мнение о том же человеке менять можно
  const cap = policy.dailyNewReviewsCap;
  if (facts.ownStatus === null && cap > 0) {
    const inWindow = facts.windowSecondsLeft.length;
    if (inWindow >= cap) {
      // место освободится, когда из окна выйдет столько старых отзывов, чтобы
      // в нём осталось cap - 1
      const freesIn = facts.windowSecondsLeft[inWindow - cap] ?? 1;
      return deny("daily_cap", Math.max(1, Math.ceil(freesIn)));
    }
  }

  return { allowed: true, ownStatus: facts.ownStatus };
}

/**
 * Текст отказа — один и тот же на странице анкеты и в форме после отправки.
 * `wait` — уже отформатированный срок («через 5 ч»), его делает
 * `formatRetryAfter` из `lib/unlock-limits.ts` на месте вызова: этот модуль
 * намеренно ничего не импортирует.
 */
export function reviewDenialText(
  reason: ReviewDenial,
  wait: string | null,
  policy: ReviewPolicy = REVIEW_POLICY
): string {
  const when = wait ?? "позже";
  switch (reason) {
    case "own_profile":
      return "Нельзя оставить отзыв о собственной анкете.";
    case "not_unlocked":
      return "Отзыв может оставить семья, которая открыла контакты этого специалиста, — так в отзывах остаются те, кто с ним действительно общался.";
    case "hidden_by_moderator":
      return "Отзыв не опубликован модератором.";
    case "account_too_new":
      return `Отзывы принимаются от аккаунтов, зарегистрированных больше ${policy.minAccountAgeHours} ч назад. Оставить отзыв можно будет ${when}.`;
    case "unlock_too_new":
      return `Отзыв можно оставить через ${policy.minUnlockAgeHours} ч после открытия контактов — так в отзывах остаются те, кто успел пообщаться со специалистом. Оставить отзыв можно будет ${when}.`;
    case "daily_cap":
      return `Новых отзывов за 24 часа — не больше ${policy.dailyNewReviewsCap}. Следующий можно будет оставить ${when}.`;
  }
}
