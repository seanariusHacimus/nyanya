import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, emailOTP } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { APIError, createAuthMiddleware, getIp, isAPIError } from "better-auth/api";
import { db } from "@/db";
import { user, session, account, verification } from "@/db/auth-schema";
import { IP_ADDRESS_OPTIONS } from "@/lib/client-ip";
import { authRateLimitStorage } from "@/lib/rate-limit";
import { sendOtpEmail, sendPasswordResetOtpEmail } from "@/lib/email";
import {
  TOO_MANY_LOGIN_ATTEMPTS,
  clearAllLoginFailures,
  clearLoginFailuresForIp,
  describeThrottleError,
  loginEmailFromBody,
  loginLockMinutesLeft,
  recordLoginFailure,
  sweepOldLoginAttempts,
} from "@/lib/login-throttle";

/**
 * Код на почту — только при регистрации, вход — по паролю.
 *
 * Регистрация: адрес → код из письма → `signIn.emailOtp` заводит аккаунт с
 * уже подтверждённой почтой и сразу открывает сессию → пользователь задаёт
 * имя, телефон и пароль (`completeProfile`). Дальше он входит паролем, и
 * никакие коды больше не нужны.
 *
 * Подтверждение адреса при входе по паролю намеренно не требуется
 * (`requireEmailVerification: false`): у аккаунтов, заведённых до этой схемы,
 * почта не подтверждена, и включение проверки закрыло бы им вход.
 *
 * Забытый пароль: код на почту → новый пароль (`/reset-password`). Ссылку в
 * письме не шлём — код короче, вводится с телефона и не ломается почтовыми
 * клиентами, которые «прокликивают» ссылки ради проверки на вирусы. Коды входа
 * и восстановления хранятся под разными ключами и не заменяют друг друга.
 *
 * Перебор паролей: кроме лимита Better Auth по IP, неудачи считаются по адресу
 * почты в базе (`lib/login-throttle.ts`, `hooks` ниже). Счётчики обоих — в
 * Postgres (`rateLimit` ниже).
 *
 * Роли: parent (по умолчанию) · specialist · admin (только вручную/сидом).
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  user: {
    additionalFields: {
      phone: { type: "string", required: false, input: true },
      phoneVerified: {
        type: "boolean",
        required: false,
        input: false,
        defaultValue: false,
      },
      locale: { type: "string", required: false, input: true, defaultValue: "ru" },
    },
  },
  emailAndPassword: {
    enabled: true,
    /**
     * Регистрация — только через код из письма (/sign-in/email-otp).
     *
     * Штатный эндпоинт /sign-up/email оставался включённым и создавал аккаунт
     * с рабочей сессией на любой адрес без подтверждения, а заодно отвечал
     * по-разному для занятого и свободного адреса (аудит 2026-09-14). Вход по
     * паролю этим не затрагивается: пароль пишет completeProfile после кода,
     * а администратор заводит специалиста прямой вставкой в базу.
     */
    disableSignUp: true,
    // у аккаунтов, заведённых до перехода на коды, адрес не подтверждён —
    // включение проверки закрыло бы им вход (см. комментарий выше)
    requireEmailVerification: false,
    // после регистрации сессия создаётся сразу, отдельного входа не нужно
    autoSignIn: true,
    minPasswordLength: 8,
    /**
     * Успешный сброс закрывает все прежние сессии.
     *
     * Пароль восстанавливают в том числе тогда, когда в аккаунт кто-то влез.
     * Если оставить старые сессии живыми, смена пароля не выгонит чужого — он
     * продолжит сидеть под уже выданной cookie. Владельцу это стоит одного
     * повторного входа на других устройствах, и оно того стоит.
     */
    revokeSessionsOnPasswordReset: true,
  },
  /**
   * Кэш сессии в куке `better-auth.session_data` (2026-09-16).
   *
   * Данные сессии и пользователя подписываются HMAC и кладутся в куку, поэтому
   * серверный рендер приватных страниц и каждое действие перестают ходить в
   * базу за сессией: раньше это были два запроса (session по token, потом user)
   * на каждый рендер /account, /specialist, /admin и на каждый вызов
   * /api/notifications/unread, который шапка дёргает при каждом переходе.
   *
   * Цена — задержка: блокировка (`banUser`), смена роли и отзыв сессий при
   * сбросе пароля доходят до устройства, где кука уже выдана, не позже чем
   * через maxAge. Вход при этом блокируется сразу — сессия создаётся через
   * базу. Админские точки читают сессию с `disableCookieCache: true`
   * (`getSessionUncached` ниже), поэтому для админки лага нет.
   *
   * Кука живёт ровно maxAge и автоматически не продлевается (`refreshCache` по
   * умолчанию выключен и с базой не работает): по истечении Better Auth снова
   * идёт в базу и не находит удалённую сессию. Прямая запись в таблицу `user`
   * мимо Better Auth обязана переписать кэш — см. `getSessionUncached`.
   */
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  // путь отвечает 404 ещё до лимитов и хуков — снаружи эндпоинта просто нет
  disabledPaths: ["/sign-up/email"],
  /**
   * Единственные глобальные хуки Better Auth: библиотека принимает ровно одну
   * функцию `before` и одну `after` на весь сервис (dispatch берёт
   * `options.hooks.before/after` как есть, списка нет). Новой логике нужен
   * хук — дописывать ветку в эти функции; другой объект `hooks`, подмешанный
   * в опции, заменил бы этот целиком вместе с защитой от перебора. Оба
   * вызываются на КАЖДОМ запросе к /api/auth/* (включая get-session с каждой
   * страницы), поэтому проверка пути стоит первой и в базу ходят только
   * нужные пути.
   *
   * Порядок на /sign-in/email: disabledPaths → лимит по IP (3 за 10 с) →
   * before (блокировка по почте) → обработчик → after (учёт результата).
   */
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-in/email") return;
      sweepOldLoginAttempts();
      // тело здесь ещё не проверено схемой эндпоинта — см. loginEmailFromBody
      const email = loginEmailFromBody(ctx.body);
      if (!email) return;

      let minutesLeft: number | null = null;
      try {
        minutesLeft = await loginLockMinutesLeft(email, clientIp(ctx));
      } catch (error) {
        // сбой учёта не должен закрыть вход всем: лимит по IP остаётся
        console.error("[login-throttle] lock check failed", describeThrottleError(error));
        return;
      }
      if (minutesLeft) {
        throw new APIError(
          "TOO_MANY_REQUESTS",
          {
            code: TOO_MANY_LOGIN_ATTEMPTS,
            message: "Too many failed sign-in attempts",
            retryAfterMinutes: minutesLeft,
          },
          { "Retry-After": String(minutesLeft * 60) },
        );
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      const path = ctx.path;
      if (
        path !== "/sign-in/email" &&
        path !== "/sign-in/email-otp" &&
        path !== "/email-otp/reset-password"
      ) {
        return;
      }
      const email = loginEmailFromBody(ctx.body);
      if (!email) return;
      // при ошибке обработчика здесь лежит сам APIError, после успеха — ответ
      const returned = ctx.context.returned;

      try {
        if (path === "/sign-in/email") {
          if (!isAPIError(returned)) {
            await clearLoginFailuresForIp(email, clientIp(ctx));
          } else if (
            // только неверный пароль (или неизвестный адрес — ответ тот же).
            // 403 BANNED_USER бросается уже после проверки пароля, 400 — это
            // ошибка тела, 429 сюда не доходит вовсе: ничто из этого не перебор
            returned.statusCode === 401 &&
            returned.body?.code === "INVALID_EMAIL_OR_PASSWORD"
          ) {
            await recordLoginFailure(email, clientIp(ctx));
          }
          return;
        }
        // код из письма доказал владение почтой — все счётчики адреса снимаются
        if (!isAPIError(returned)) await clearAllLoginFailures(email);
      } catch (error) {
        // вход уже состоялся или уже отклонён; сбой учёта не меняет ответ
        console.error("[login-throttle] bookkeeping failed", describeThrottleError(error));
      }
    }),
  },
  advanced: {
    // список доверенных прокси и почему он нужен — в lib/client-ip.ts; оттуда же
    // IP берёт форма обратной связи, чтобы все лимиты видели один адрес
    ipAddress: IP_ADDRESS_OPTIONS,
  },
  /**
   * Счётчики ограничения частоты — в Postgres (таблица `rate_limit`), а не в
   * памяти процесса: деплой их не обнуляет, второй экземпляр приложения не
   * умножает предел. Правила и окна — встроенные, без изменений, всё с одного
   * IP на путь: вход по паролю (и смена пароля или почты) 3 запроса за 10 с;
   * отправка и проверка кода, вход по коду и сброс пароля — 3 за 60 с (правила
   * плагина emailOTP); остальные пути, включая get-session, — 100 за 10 с.
   * `enabled` не задан — Better Auth включает лимиты только при
   * NODE_ENV=production.
   *
   * Хранилище своё, а не штатное `storage: "database"`: штатное пропускает
   * одновременные запросы с одного IP сверх предела (почему — в
   * `lib/rate-limit.ts`). С `customStorage` поле `storage` Better Auth не читает.
   */
  rateLimit: {
    customStorage: authRateLimitStorage,
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      // 10 минут: письмо может идти минуту-другую, а запрос нового кода
      // аннулирует предыдущий — запас снижает шанс «устаревшего кода»
      expiresIn: 600,
      allowedAttempts: 5,
      async sendVerificationOTP({ email, otp, type }) {
        // код восстановления может прийти и тому, кто его не запрашивал, —
        // такое письмо обязано отличаться от кода подтверждения при регистрации
        if (type === "forget-password") {
          await sendPasswordResetOtpEmail(email, otp);
          return;
        }
        await sendOtpEmail(email, otp);
      },
    }),
    admin({ adminRoles: ["admin"], defaultRole: "parent" }),
    nextCookies(), // должен оставаться последним
  ],
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,

  /**
   * Откуда разрешено обращаться к аутентификации.
   *
   * Better Auth сверяет заголовок Origin со списком доверенных и на
   * несовпадение отвечает 403 INVALID_ORIGIN. По умолчанию в списке только
   * `baseURL`, поэтому запросы с nyanya.uz отклонялись — а после подключения
   * домена это весь реальный трафик. Ошибку легко не заметить: curl заголовок
   * Origin не шлёт, и проверка через него проходит успешно.
   *
   * Список задаётся явно, а не выводится из baseURL: доменов у сервиса больше
   * одного, и адрес Railway должен продолжать работать.
   */
  trustedOrigins: [
    "https://nyanya.uz",
    "https://www.nyanya.uz",
    "https://nyanya-production.up.railway.app",
    ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",").map((o) => o.trim()) ??
      []),
  ].filter(Boolean),
});

export type Session = typeof auth.$Infer.Session;

/**
 * Сессия из базы, мимо кэша в куке (`session.cookieCache` выше).
 *
 * Нужна в двух случаях:
 *
 * 1. Проверка роли admin — страницы /admin и админские действия. Снятая роль и
 *    блокировка должны действовать сразу, а не через пять минут.
 * 2. После прямой записи в таблицу `user` (роль, имя, телефон): Better Auth о
 *    такой записи не знает, а этот вызов перечитывает пользователя из базы и
 *    переписывает куку кэша. Без него специалист сразу после регистрации ещё
 *    пять минут считался бы родителем. Работает только там, где Next разрешает
 *    Set-Cookie, — в server actions и маршрутах, не в серверных компонентах.
 */
export async function getSessionUncached(requestHeaders: Headers) {
  return auth.api.getSession({
    headers: requestHeaders,
    query: { disableCookieCache: true },
  });
}

/**
 * IP клиента ровно так, как его видит Better Auth (тот же `getIp` с теми же
 * `trustedProxies`), — чтобы блокировка и лимит по IP говорили об одном адресе.
 */
function clientIp(ctx: {
  request?: Request;
  headers?: Headers;
  context: { options: Parameters<typeof getIp>[1] };
}): string | null {
  const source = ctx.request ?? ctx.headers;
  return source ? getIp(source, ctx.context.options) : null;
}
