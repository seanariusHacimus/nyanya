import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, emailOTP, phoneNumber } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import { user, session, account, verification } from "@/db/auth-schema";
import { sendOtpEmail } from "@/lib/email";
import { isCanonicalPhone, sendOtpSms } from "@/lib/sms";

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
 * Роли: parent (по умолчанию) · specialist · admin (только вручную/сидом).
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  user: {
    /**
     * Телефона здесь нет намеренно: им владеет плагин `phoneNumber` (ниже).
     * Объявить поле и здесь, и в плагине значило бы дать одной колонке два
     * разных ключа — расходились бы значения в сессии и в базе.
     */
    additionalFields: {
      locale: { type: "string", required: false, input: true, defaultValue: "ru" },
    },
  },
  emailAndPassword: {
    enabled: true,
    // подтверждать адрес нечем — письма не доставляются (см. комментарий выше)
    requireEmailVerification: false,
    // после регистрации сессия создаётся сразу, отдельного входа не нужно
    autoSignIn: true,
    minPasswordLength: 8,
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
      async sendVerificationOTP({ email, otp }) {
        await sendOtpEmail(email, otp);
      },
    }),
    /**
     * Подтверждение телефона кодом из SMS.
     *
     * Отправка идёт через `lib/sms`, а он без ключей Eskiz только пишет код в
     * лог сервера — значит сам факт подключения плагина ничего наружу не шлёт
     * и денег не тратит.
     *
     * `requireVerification` намеренно выключен: включить его — значит закрыть
     * вход всем, кто зарегистрировался до появления SMS. Это отдельное
     * решение, принимать его нужно после того, как SMS начнут доходить
     * стабильно, и вместе с разовой миграцией для существующих аккаунтов.
     *
     * Схема отображается на уже существующие колонки `phone` / `phone_verified`
     * — новой таблицы и новых колонок не появляется, старые данные остаются
     * на месте.
     */
    phoneNumber({
      otpLength: 6,
      // столько же, сколько у кода из письма: SMS иногда идёт минуту-другую
      expiresIn: 600,
      allowedAttempts: 5,
      requireVerification: false,
      /**
       * Принимаем только канонический `998XXXXXXXXX`. Плагин сохраняет номер
       * дословно и проверяет занятость сравнением строк, поэтому «+998 90 …»
       * и «998…» завели бы два аккаунта на один телефон. Приводит к канону
       * форма — до обращения сюда.
       */
      phoneNumberValidator: (value) => isCanonicalPhone(value),
      async sendOTP({ phoneNumber: to, code }) {
        await sendOtpSms(to, code);
      },
      schema: {
        user: {
          fields: {
            phoneNumber: "phone",
            phoneNumberVerified: "phoneVerified",
          },
        },
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
