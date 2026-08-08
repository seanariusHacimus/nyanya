/**
 * Первое SMS: проверка связки «наш код → Eskiz → телефон» без запуска сайта.
 *
 * Ничего не трогает в базе и в приложении — только логинится в шлюз и
 * отправляет одно сообщение. Это самый короткий способ понять, работают ли
 * выданные доступы, до того как включать SMS в регистрации.
 *
 *   ESKIZ_EMAIL=... ESKIZ_SECRET=... node scripts/sms-check.mjs 998901234567
 *
 * Флаги:
 *   --text "..."   свой текст (в тестовом статусе аккаунта Eskiz его отвергнет)
 *   --balance      показать баланс и цены, ничего не отправляя
 *   --dry          проверить только авторизацию и нормализацию номера
 *
 * Пароль — это СЕКРЕТНЫЙ КЛЮЧ из кабинета (Смс → Смс шлюз), а не пароль от
 * личного кабинета: с ним шлюз отвечает invalid_credentials.
 */
const API = "https://notify.eskiz.uz/api";
const TEST_TEXT = "Это тест от Eskiz";

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const value = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? undefined : argv[i + 1];
};
const rawPhone = argv.find((a) => !a.startsWith("--") && argv[argv.indexOf(a) - 1] !== "--text");

const { ESKIZ_EMAIL: email, ESKIZ_SECRET: secret, ESKIZ_FROM: from } = process.env;

if (!email || !secret) {
  console.error(
    "Нужны ESKIZ_EMAIL и ESKIZ_SECRET.\n" +
      "Оба берутся в кабинете Eskiz: Смс → Смс шлюз (my.eskiz.uz/sms/settings).\n" +
      "ESKIZ_SECRET — это секретный ключ, НЕ пароль от личного кабинета."
  );
  process.exit(1);
}

/** Тот же разбор номера, что и в приложении (src/lib/sms/phone.ts). */
const OPERATOR_CODES = ["33", "77", "88", "90", "91", "93", "94", "95", "97", "98", "99"];
function normalizePhone(raw) {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (d.startsWith("998")) d = d.slice(3);
  else if (d.length === 10 && d.startsWith("8")) d = d.slice(1);
  if (d.length !== 9 || !OPERATOR_CODES.includes(d.slice(0, 2))) {
    throw new Error(`не похоже на узбекский номер: ${raw}`);
  }
  return `998${d}`;
}

async function readJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function show(label, value) {
  console.log(`${label}:`, typeof value === "string" ? value : JSON.stringify(value, null, 2));
}

// 1 — авторизация
const loginRes = await fetch(`${API}/auth/login`, {
  method: "POST",
  body: new URLSearchParams({ email, password: secret }),
});
const loginJson = await readJson(loginRes);

if (!loginRes.ok) {
  console.error(`Авторизация не прошла (HTTP ${loginRes.status})`);
  show("ответ", loginJson);
  if (loginRes.status === 401) {
    console.error(
      "\nЧаще всего причина одна: в ESKIZ_SECRET положили пароль от личного\n" +
        "кабинета вместо секретного ключа со вкладки Смс → Смс шлюз."
    );
  }
  process.exit(1);
}

const token = loginJson?.data?.token ?? loginJson?.token;
if (!token) {
  console.error("Авторизация прошла, но токена в ответе нет.");
  show("ответ", loginJson);
  process.exit(1);
}
console.log(`✓ авторизация прошла, токен получен (${String(token).length} символов)`);

const authorized = (path, init = {}) =>
  fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...init.headers } });

// 2 — кто мы и сколько денег
const me = await readJson(await authorized("/auth/user"));
const data = me?.data ?? {};
console.log(
  `✓ аккаунт: ${data.name ?? "—"} · статус «${data.status ?? "—"}» · баланс ${data.balance ?? "—"}`
);
if (data.status && String(data.status).toLowerCase() !== "active") {
  console.log(
    `  Внимание: статус не «active» — Eskiz разрешает только текст «${TEST_TEXT}».`
  );
}

if (flag("balance")) {
  show("цены", await readJson(await authorized("/user/get-limit")));
  process.exit(0);
}

if (!rawPhone) {
  console.error("\nУкажите номер получателя: node scripts/sms-check.mjs 998901234567");
  process.exit(1);
}

let phone;
try {
  phone = normalizePhone(rawPhone);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const text = value("text") ?? TEST_TEXT;
console.log(`\nномер: ${phone}\nтекст: ${text}\nподпись: ${from ?? "— (короткий номер Eskiz)"}`);

if (flag("dry")) {
  console.log("\n(--dry: отправку не выполняем)");
  process.exit(0);
}

// 3 — отправка
const form = new FormData();
form.set("mobile_phone", phone);
form.set("message", text);
if (from) form.set("from", from);

const sendRes = await authorized("/message/sms/send", { method: "POST", body: form });
const sendJson = await readJson(sendRes);

if (!sendRes.ok) {
  console.error(`\nОтправка не прошла (HTTP ${sendRes.status})`);
  show("ответ", sendJson);
  process.exit(1);
}

console.log("\n✓ Eskiz принял сообщение");
show("ответ", sendJson);

const id = sendJson?.id ?? sendJson?.data?.id ?? sendJson?.message_id;
if (id) {
  console.log(
    `\nПроверить доставку:\n  curl -s -H "Authorization: Bearer <токен>" ${API}/message/sms/status_by_id/${id}`
  );
}
console.log("\nПринято шлюзом ≠ доставлено. Дождитесь SMS на телефоне.");
