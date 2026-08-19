/**
 * Приём формы обращения (§15 CT3) и отправка владельцу на почту.
 *
 * Раньше обращения уходили в Telegram, но токен бота так и не был задан —
 * маршрут отвечал 503, а форма показывала посетителю ошибку и просила
 * написать на почту, которой на сайте уже нет. Теперь письмо отправляется
 * через Resend с подтверждённого домена, адрес получателя — CONTACT_EMAIL_TO.
 */
import { sendContactMessage } from "@/lib/email";

export const dynamic = "force-dynamic";

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

export async function POST(request: Request) {
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

  try {
    await sendContactMessage({ name, contact, message });
  } catch (error) {
    console.error("[contact] не удалось отправить письмо", error);
    return Response.json({ ok: false, error: "send_failed" }, { status: 502 });
  }

  return Response.json({ ok: true });
}
