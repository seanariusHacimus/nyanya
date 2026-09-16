// Запуск: node --experimental-strip-types --test src/lib/review-policy.test.mjs
// Чистое решение «можно ли сохранить отзыв». Сбор фактов из базы и гонки
// проверяются вручную на локальном стеке.
import { test } from "node:test";
import assert from "node:assert/strict";
import { REVIEW_POLICY, decideReview, reviewDenialText } from "./review-policy.ts";

const DAY = 86_400;
const ok = {
  isOwnProfile: false,
  accountAgeSec: 10 * DAY,
  unlockAgeSec: 2 * DAY,
  ownStatus: null,
  windowSecondsLeft: [],
};

test("числа по умолчанию — решение владельца", () => {
  assert.deepEqual(REVIEW_POLICY, {
    minAccountAgeHours: 24,
    minUnlockAgeHours: 24,
    dailyNewReviewsCap: 3,
  });
});

test("всё выполнено — можно", () => {
  assert.deepEqual(decideReview(ok), { allowed: true, ownStatus: null });
});

test("своя анкета и скрытый отзыв отказывают раньше остального", () => {
  assert.equal(
    decideReview({ ...ok, isOwnProfile: true, unlockAgeSec: null }).reason,
    "own_profile"
  );
  assert.deepEqual(decideReview({ ...ok, ownStatus: "hidden", accountAgeSec: 5 }), {
    allowed: false,
    reason: "hidden_by_moderator",
    retryAfterSec: null,
  });
});

test("контакты не открыты", () => {
  assert.equal(decideReview({ ...ok, unlockAgeSec: null }).reason, "not_unlocked");
});

test("возраст аккаунта и открытия: называется больший срок", () => {
  assert.deepEqual(decideReview({ ...ok, accountAgeSec: DAY - 100 }), {
    allowed: false,
    reason: "account_too_new",
    retryAfterSec: 100,
  });
  assert.deepEqual(decideReview({ ...ok, unlockAgeSec: DAY - 3600 }), {
    allowed: false,
    reason: "unlock_too_new",
    retryAfterSec: 3600,
  });
  // аккаунт 10 ч, контакты открыты 5 ч назад — ждать 19 ч, а не 14
  assert.deepEqual(
    decideReview({ ...ok, accountAgeSec: 10 * 3600, unlockAgeSec: 5 * 3600 }),
    { allowed: false, reason: "unlock_too_new", retryAfterSec: 19 * 3600 }
  );
  // ровно сутки — уже можно; отрицательный возраст считается нулём
  assert.equal(decideReview({ ...ok, accountAgeSec: DAY, unlockAgeSec: DAY }).allowed, true);
  assert.equal(decideReview({ ...ok, unlockAgeSec: -50 }).retryAfterSec, DAY);
});

test("суточный лимит новых отзывов и срок освобождения места", () => {
  assert.equal(decideReview({ ...ok, windowSecondsLeft: [10, 20] }).allowed, true);
  assert.deepEqual(decideReview({ ...ok, windowSecondsLeft: [100.2, 200, 300] }), {
    allowed: false,
    reason: "daily_cap",
    retryAfterSec: 101,
  });
  // в окне больше лимита (лимит уменьшили) — место освободится, когда останется cap - 1
  assert.equal(
    decideReview({ ...ok, windowSecondsLeft: [50, 60, 70, 80, 90] }).retryAfterSec,
    70
  );
});

test("правка своего отзыва под лимит не попадает", () => {
  for (const ownStatus of ["pending", "visible"]) {
    assert.deepEqual(
      decideReview({ ...ok, ownStatus, windowSecondsLeft: [1, 2, 3, 4] }),
      { allowed: true, ownStatus }
    );
  }
});

test("0 выключает правило", () => {
  const off = { minAccountAgeHours: 0, minUnlockAgeHours: 0, dailyNewReviewsCap: 0 };
  assert.equal(
    decideReview(
      { ...ok, accountAgeSec: 0, unlockAgeSec: 0, windowSecondsLeft: [1, 2, 3, 4, 5] },
      off
    ).allowed,
    true
  );
  // но контакты открыть всё равно нужно
  assert.equal(decideReview({ ...ok, unlockAgeSec: null }, off).reason, "not_unlocked");
});

test("тексты отказов: срок и числа из правил", () => {
  assert.equal(
    reviewDenialText("daily_cap", "через 5 ч"),
    "Новых отзывов за 24 часа — не больше 3. Следующий можно будет оставить через 5 ч."
  );
  assert.match(reviewDenialText("unlock_too_new", null), /через 24 ч после открытия контактов.*позже\.$/);
  assert.equal(reviewDenialText("hidden_by_moderator", null), "Отзыв не опубликован модератором.");
});
