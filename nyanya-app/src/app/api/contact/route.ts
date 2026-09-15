/**
 * Приём формы обращения (§15 CT3) и отправка владельцу на почту.
 *
 * Раньше обращения уходили в Telegram, но токен бота так и не был задан —
 * маршрут отвечал 503, а форма показывала посетителю ошибку и просила
 * написать на почту, которой на сайте уже нет. Теперь письмо отправляется
 * через Resend с подтверждённого домена, адрес получателя — CONTACT_EMAIL_TO.
 */
import { clientIpFromHeaders } from "@/lib/client-ip";
import { sendContactMessage } from "@/lib/email";
import { describeThrottleError } from "@/lib/login-throttle";
import { consumeRateLimit, type RateLimitRule } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const LIMITS = { name: 100, contact: 120, message: 2000 };

/**
 * Пределы частоты — счётчики в Postgres (`lib/rate-limit.ts`), деплой их не
 * обнуляет. На любом из двух — 429 `rate_limited`, и форма говорит «Слишком
 * много обращений подряд».
 */
const CONTACT_RATE_LIMITS = {
  /** С одного IP — не больше 5 обращений за 10 минут. */
  perIp: { max: 5, windowSeconds: 10 * 60 },
  /**
   * Со всего сайта — не больше 30 писем в час: лимит по IP не защищает почту
   * владельца от рассылки с множества адресов.
   */
  siteWide: { max: 30, windowSeconds: 60 * 60 },
} satisfies Record<string, RateLimitRule>;

function tooManyRequests(retryAfterSeconds: number) {
  return Response.json(
    { ok: false, error: "rate_limited" },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
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
  // оценка сервиса: 1–5, ноль означает «не поставили»
  const ratingRaw = Number(body.rating ?? 0);
  const rating =
    Number.isInteger(ratingRaw) && ratingRaw >= 1 && ratingRaw <= 5
      ? ratingRaw
      : null;

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

  // тот же разбор цепочки прокси, что у Better Auth: левый край X-Forwarded-For
  // присылает сам клиент, и по нему лимит обходился подстановкой нового адреса.
  // Без определяемого адреса все попадают в одну корзину — её прикрывает и
  // общий предел сайта
  const ip = clientIpFromHeaders(request.headers) ?? "unknown";

  try {
    // сначала адрес: запросы, отбитые по IP, не расходуют общий предел сайта
    const perIp = await consumeRateLimit(`contact:ip:${ip}`, CONTACT_RATE_LIMITS.perIp);
    if (!perIp.allowed) return tooManyRequests(perIp.retryAfterSeconds);
    const siteWide = await consumeRateLimit("contact:all", CONTACT_RATE_LIMITS.siteWide);
    if (!siteWide.allowed) return tooManyRequests(siteWide.retryAfterSeconds);
  } catch (error) {
    // без счётчика письмо не отправляем: иначе при сбое базы предела нет вовсе.
    // В журнал — только причина от драйвера, без ключа с IP
    console.error("[contact] rate limit check failed", describeThrottleError(error));
    return Response.json({ ok: false, error: "unavailable" }, { status: 503 });
  }

  try {
    await sendContactMessage({ name, contact, message, rating });
  } catch (error) {
    console.error("[contact] не удалось отправить письмо", error);
    return Response.json({ ok: false, error: "send_failed" }, { status: 502 });
  }

  return Response.json({ ok: true });
}
