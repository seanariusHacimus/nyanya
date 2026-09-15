import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, emailOTP } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { APIError, createAuthMiddleware, getIp, isAPIError } from "better-auth/api";
import { db } from "@/db";
import { user, session, account, verification } from "@/db/auth-schema";
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
 * почты в базе (`lib/login-throttle.ts`, `hooks` ниже).
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
    ipAddress: {
      /**
       * Без этого ограничение частоты запросов не работает как задумано.
       *
       * Better Auth читает X-Forwarded-For, но без списка доверенных прокси
       * принимает заголовок только с одним адресом. Railway терминирует
       * TLS на своём edge и дописывает собственный хоп, адресов становится
       * больше одного — IP не определялся, и все клиенты попадали в одну
       * общую корзину лимитов на путь. При входе по паролю это особенно
       * неприятно: перебор паролей больше не ограничивался по источнику.
       *
       * Разбор идёт справа налево, внутренние адреса пропускаются, первым
       * недоверенным оказывается реальный клиент. Подделать заголовок не
       * получится: значение, дописанное edge последним, перекрывает то,
       * что прислал клиент.
       */
      trustedProxies: [
        "10.0.0.0/8",
        "172.16.0.0/12",
        "192.168.0.0/16",
        "127.0.0.0/8",
        "::1/128",
        "fd00::/8",
      ],
    },
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
