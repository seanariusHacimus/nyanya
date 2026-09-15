// Запуск: node --experimental-strip-types --test src/lib/unlock-limits.test.mjs
// Чистые функции лимита открытий контактов: разбор переменных, решение и текст
// ожидания. Запросы к базе проверяются вручную на локальном стеке.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  UNLOCK_LIMIT_DEFAULTS,
  decideUnlock,
  formatRetryAfter,
  parseUnlockLimits,
} from "./unlock-limits.ts";

test("parseUnlockLimits: без переменных — значения по умолчанию", () => {
  assert.deepEqual(parseUnlockLimits({}), { dailyCap: 20, minIntervalSec: 3 });
  assert.deepEqual(parseUnlockLimits({}), UNLOCK_LIMIT_DEFAULTS);
});

test("parseUnlockLimits: корректные значения принимаются", () => {
  assert.deepEqual(
    parseUnlockLimits({ CONTACT_UNLOCK_DAILY_CAP: " 3 ", CONTACT_UNLOCK_MIN_INTERVAL_SEC: "0" }),
    { dailyCap: 3, minIntervalSec: 0 }
  );
});

test("parseUnlockLimits: мусор и лимит 0 — значения по умолчанию", () => {
  for (const bad of ["", "0", "-5", "2.5", "20abc", "abc", "1e3"]) {
    assert.equal(parseUnlockLimits({ CONTACT_UNLOCK_DAILY_CAP: bad }).dailyCap, 20, bad);
  }
  for (const bad of ["", "-1", "1.5", "x"]) {
    assert.equal(
      parseUnlockLimits({ CONTACT_UNLOCK_MIN_INTERVAL_SEC: bad }).minIntervalSec,
      3,
      bad
    );
  }
});

const limits = { dailyCap: 3, minIntervalSec: 3 };

test("decideUnlock: первое открытие", () => {
  assert.deepEqual(decideUnlock({ opened24h: 0, secondsSinceLast: null }, limits), {
    allowed: true,
    reachesCap: false,
  });
});

test("decideUnlock: открытие, исчерпывающее лимит", () => {
  assert.deepEqual(decideUnlock({ opened24h: 2, secondsSinceLast: 10 }, limits), {
    allowed: true,
    reachesCap: true,
  });
});

test("decideUnlock: слишком быстро — ожидание округляется вверх", () => {
  assert.deepEqual(decideUnlock({ opened24h: 1, secondsSinceLast: 0.4 }, limits), {
    allowed: false,
    reason: "too_fast",
    retryAfterSec: 3,
  });
  assert.deepEqual(decideUnlock({ opened24h: 1, secondsSinceLast: 2.99 }, limits), {
    allowed: false,
    reason: "too_fast",
    retryAfterSec: 1,
  });
  assert.equal(decideUnlock({ opened24h: 1, secondsSinceLast: 3 }, limits).allowed, true);
  // ожидание не бывает больше самой паузы
  assert.deepEqual(decideUnlock({ opened24h: 1, secondsSinceLast: -0.7 }, limits), {
    allowed: false,
    reason: "too_fast",
    retryAfterSec: 3,
  });
});

test("decideUnlock: суточный лимит важнее паузы", () => {
  assert.deepEqual(decideUnlock({ opened24h: 3, secondsSinceLast: 0.1 }, limits), {
    allowed: false,
    reason: "daily_limit",
  });
  assert.deepEqual(decideUnlock({ opened24h: 4, secondsSinceLast: 100 }, limits), {
    allowed: false,
    reason: "daily_limit",
  });
});

test("decideUnlock: пауза 0 не мешает", () => {
  const noPause = { dailyCap: 20, minIntervalSec: 0 };
  assert.equal(decideUnlock({ opened24h: 5, secondsSinceLast: 0 }, noPause).allowed, true);
});

test("formatRetryAfter", () => {
  const cases = [
    [0, "через 1 с"],
    [2.2, "через 3 с"],
    [59, "через 59 с"],
    [60, "через 1 мин"],
    [61, "через 2 мин"],
    [40 * 60, "через 40 мин"],
    [59 * 60 + 1, "через 1 ч"],
    [3600, "через 1 ч"],
    [3601, "через 1 ч 1 мин"],
    [5 * 3600 + 12 * 60, "через 5 ч 12 мин"],
    [24 * 3600, "через 24 ч"],
  ];
  for (const [seconds, expected] of cases) {
    assert.equal(formatRetryAfter(seconds), expected, String(seconds));
  }
});
