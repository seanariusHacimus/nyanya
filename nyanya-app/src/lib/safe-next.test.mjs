// Запуск: node --experimental-strip-types --test src/lib/safe-next.test.mjs
// Тестового фреймворка в проекте нет намеренно; это единственная чистая функция
// с перечислимыми граничными случаями, и ручная проверка редиректа дороже.
import { test } from "node:test";
import assert from "node:assert/strict";
import { safeNext } from "./safe-next.ts";

const cases = [
  // [вход, ожидаемый результат]
  ["/catalog", "/catalog"],
  ["/specialists/abdullaeva?x=1", "/specialists/abdullaeva?x=1"],
  ["/account", "/account"],
  [null, null],
  ["", null],
  ["catalog", null],
  ["https://evil.com", null],
  ["//evil.com", null],
  ["/\\evil.com", null],
  ["/a/..//evil.com", null],
  ["/a/../\\evil.com", null],
  ["/./..//evil.com", null],
  ["/%2F%2Fevil.com", "/%2F%2Fevil.com"], // закодированные косые остаются путём этого сайта
  ["/login", null],
  ["/login?next=/x", null],
  ["/register", null],
  ["/reset-password/x", null],
  ["/" + "a".repeat(2100), null],
];

for (const [input, expected] of cases) {
  test(`safeNext(${JSON.stringify(input)?.slice(0, 40)})`, () => {
    assert.equal(safeNext(input), expected);
  });
}
