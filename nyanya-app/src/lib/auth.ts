import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, emailOTP } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import { user, session, account, verification } from "@/db/auth-schema";
import { sendOtpEmail, sendPasswordResetOtpEmail } from "@/lib/email";

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
