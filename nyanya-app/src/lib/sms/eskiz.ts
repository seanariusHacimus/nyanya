import { normalizePhone } from "./phone";
import { SmsError, type SmsMessage, type SmsSendResult, type SmsSender } from "./types";

/**
 * Клиент SMS-шлюза Eskiz.uz.
 *
 * Документации в виде сайта у Eskiz нет — есть публичная коллекция Postman
 * (documenter.getpostman.com/view/663428/RzfmES4z). Оттуда взяты имена
 * эндпоинтов и полей; проверено живьём 2026-08-08, что оба эндпоинта
 * существуют и без токена отвечают 401.
 *
 * Две вещи, на которых легко потерять полдня:
 *
 * 1. **Пароль от личного кабинета для API не годится.** Eskiz: «для
 *    авторизации в смс сервисе используются следующие доступы: логин — почта
 *    от кабинета, пароль — секретный ключ». Ключ лежит в кабинете на вкладке
 *    Смс → Смс шлюз. С паролем от кабинета шлюз отвечает `invalid_credentials`.
 *
 * 2. **В тестовом статусе аккаунта разрешены только три текста** — «Это тест
 *    от Eskiz» и переводы. Любой свой текст (в том числе код подтверждения)
 *    уйдёт только после активации аккаунта и модерации шаблона. Для первой
 *    проверки связи есть переключатель `ESKIZ_FORCE_TEST_TEXT`.
 */

const API = "https://notify.eskiz.uz/api";

/**
 * Потолок ожидания шлюза. Без него зависший Eskiz держал бы запрос
 * пользователя до тайм-аута платформы: человек смотрел бы на «Отправляем…»
 * несколько минут вместо честной ошибки.
 */
const TIMEOUT_MS = 15_000;

/** Единственный текст, разрешённый Eskiz в тестовом статусе аккаунта. */
export const ESKIZ_TEST_TEXT = "Это тест от Eskiz";

export type EskizConfig = {
  email: string;
  secret: string;
  /** Подпись отправителя. Пока альфа-имя не одобрено — оставляем пустым. */
  from?: string;
  /**
   * Подменять текст на разрешённый тестовый. Нужно ровно один раз: чтобы
   * убедиться, что связка «наш сервер → Eskiz → телефон» работает, до того
   * как модерация одобрит боевой шаблон.
   */
  forceTestText?: boolean;
};

export function readEskizConfig(): EskizConfig | null {
  const email = process.env.ESKIZ_EMAIL;
  const secret = process.env.ESKIZ_SECRET;
  if (!email || !secret) return null;
  return {
    email,
    secret,
    from: process.env.ESKIZ_FROM || undefined,
    forceTestText: process.env.ESKIZ_FORCE_TEST_TEXT === "1",
  };
}

type TokenState = { token: string; obtainedAt: number };

/**
 * Токен живёт долго (документация Eskiz обещает 30 дней), поэтому держим его
 * в памяти процесса и обновляем сами только по истечении своего, заведомо
 * меньшего срока. Настоящий признак протухания — ответ 401, он обрабатывается
 * отдельно: полагаться только на срок нельзя, токен могли отозвать.
 */
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export function createEskizSender(config: EskizConfig): SmsSender {
  let state: TokenState | null = null;

  async function login(): Promise<string> {
    const body = new URLSearchParams({
      email: config.email,
      password: config.secret,
    });

    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const json = await readJson(res);

    if (!res.ok) {
      throw new SmsError(
        `Eskiz: ${messageOf(json) ?? "не удалось авторизоваться"}`,
        res.status,
        json
      );
    }

    const token = extractToken(json);
    if (!token) throw new SmsError("Eskiz: в ответе нет токена", res.status, json);

    state = { token, obtainedAt: Date.now() };
    return token;
  }

  async function tokenFor(forceFresh: boolean): Promise<string> {
    if (!forceFresh && state && Date.now() - state.obtainedAt < TOKEN_TTL_MS) {
      return state.token;
    }
    return login();
  }

  async function post(token: string, message: SmsMessage, to: string) {
    // multipart — ровно так отправка описана в коллекции Postman
    const form = new FormData();
    form.set("mobile_phone", to);
    if (config.forceTestText) {
      // забытый переключатель означает, что люди платно получают «Это тест от
      // Eskiz» вместо кода и не могут войти, а наружу это никак не проявляется
      console.warn(
        "[sms:eskiz] ESKIZ_FORCE_TEST_TEXT=1 — вместо настоящего текста уходит тестовый"
      );
    }
    form.set("message", config.forceTestText ? ESKIZ_TEST_TEXT : message.text);
    if (config.from) form.set("from", config.from);

    return fetch(`${API}/message/sms/send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  }

  return {
    async send(message: SmsMessage): Promise<SmsSendResult> {
      const to = normalizePhone(message.to);

      let token = await tokenFor(false);
      let res = await post(token, message, to);

      // токен могли отозвать раньше срока — пробуем ровно один раз заново
      if (res.status === 401) {
        token = await tokenFor(true);
        res = await post(token, message, to);
      }

      const json = await readJson(res);

      if (!res.ok) {
        // причина отказа приходит в теле; без неё в логе остаётся голый код
        // состояния, по которому ничего не понять
        console.error("[sms:eskiz] отказ", res.status, json);
        throw new SmsError(
          `Eskiz отказал (HTTP ${res.status}): ${messageOf(json) ?? "без пояснения"}`,
          res.status,
          json
        );
      }

      return { id: extractMessageId(json), to, provider: "eskiz" };
    },
  };
}

/** Пояснение от шлюза, если оно есть. */
function messageOf(json: unknown): string | null {
  if (typeof json === "string") return json.slice(0, 300) || null;
  if (typeof json !== "object" || json === null) return null;
  const message = (json as Record<string, unknown>).message;
  return typeof message === "string" ? message : JSON.stringify(json).slice(0, 300);
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Токен приходит внутри `data`, но у Eskiz описан нестрого — ищем оба места. */
function extractToken(json: unknown): string | null {
  if (typeof json !== "object" || json === null) return null;
  const root = json as Record<string, unknown>;
  const data = root.data as Record<string, unknown> | undefined;
  const token = data?.token ?? root.token;
  return typeof token === "string" && token.length > 0 ? token : null;
}

/**
 * Идентификатор сообщения нужен для проверки доставки. В сохранённых примерах
 * Eskiz он лежит то в `id`, то в `data.id`, поэтому берём что есть, а его
 * отсутствие ошибкой не считаем — SMS уже принято.
 */
function extractMessageId(json: unknown): string | null {
  if (typeof json !== "object" || json === null) return null;
  const root = json as Record<string, unknown>;
  const data = root.data as Record<string, unknown> | undefined;
  const id = root.id ?? data?.id ?? root.message_id;
  return id === undefined || id === null ? null : String(id);
}
