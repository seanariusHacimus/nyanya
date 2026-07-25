/**
 * Приём формы обращения (§15 CT3) и отправка в Telegram.
 *
 * Работает на сервере Next.js — токен бота живёт в переменных окружения
 * Railway и никогда не попадает в браузер. Отдельный бэкенд не нужен.
 *
 * Переменные окружения:
 *   TELEGRAM_BOT_TOKEN — токен из @BotFather
 *   TELEGRAM_CHAT_ID   — id чата/группы, куда слать обращения
 */

export const dynamic = "force-dynamic";

const TELEGRAM_API = "https://api.telegram.org";
const LIMITS = { name: 100, contact: 120, message: 2000 };

/** Простое окно частоты: не больше 5 обращений с одного IP за 10 минут. */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 500) {
    // не даём карте расти бесконечно
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
    }
  }
  return recent.length > MAX_PER_WINDOW;
}

/** Экранирование под parse_mode=HTML — текст пользователя не должен ломать разметку. */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function POST(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return Response.json(
      { ok: false, error: "not_configured" },
      { status: 503 }
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  const contact = String(body.contact ?? "").trim();
  const message = String(body.message ?? "").trim();
  const honeypot = String(body.company ?? "").trim(); // скрытое поле для ботов

  if (honeypot) {
    // тихо подтверждаем, чтобы спам-бот не искал обход
    return Response.json({ ok: true });
  }

  if (
    !name ||
    !contact ||
    !message ||
    name.length > LIMITS.name ||
    contact.length > LIMITS.contact ||
    message.length > LIMITS.message
  ) {
    return Response.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (rateLimited(ip)) {
    return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const text = [
    "<b>Новое обращение с сайта</b>",
    "",
    `<b>Имя:</b> ${esc(name)}`,
    `<b>Контакт:</b> ${esc(contact)}`,
    "",
    esc(message),
  ].join("\n");

  try {
    const response = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("[contact] telegram error", response.status, detail);
      return Response.json(
        { ok: false, error: "telegram_failed" },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("[contact] telegram request failed", error);
    return Response.json(
      { ok: false, error: "telegram_unreachable" },
      { status: 502 }
    );
  }

  return Response.json({ ok: true });
}
