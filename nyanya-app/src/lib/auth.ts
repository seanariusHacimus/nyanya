import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
// import { emailOTP } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import { user, session, account, verification } from "@/db/auth-schema";
// import { sendOtpEmail } from "@/lib/email";

/**
 * Вход и регистрация — почта + пароль, подтверждение адреса не требуется.
 *
 * ⛳ Временная конфигурация. Задумано было беспарольно (код на почту), но
 * доставка писем сейчас невозможна: в Resend нет подтверждённого домена,
 * поэтому отправка идёт с общего onboarding@resend.dev — Resend разрешает
 * его только владельцу аккаунта, а Gmail такие письма отклоняет. С кодом на
 * почту зарегистрироваться не мог никто.
 *
 * Как вернуть email-OTP, когда домен будет подтверждён:
 *   1. раскомментировать импорты emailOTP и sendOtpEmail и блок плагина ниже;
 *   2. раскомментировать emailOTPClient() в lib/auth-client.ts;
 *   3. вернуть шаг с кодом в формах входа и регистрации (см. components/auth/
 *      otp-step.tsx — компонент оставлен на месте);
 *   4. решить, что делать с уже заведёнными паролями (можно оставить оба входа).
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
    // emailOTP({
    //   otpLength: 6,
    //   // 10 минут: письмо может идти минуту-другую, а запрос нового кода
    //   // аннулирует предыдущий — запас снижает шанс «устаревшего кода»
    //   expiresIn: 600,
    //   allowedAttempts: 5,
    //   async sendVerificationOTP({ email, otp }) {
    //     await sendOtpEmail(email, otp);
    //   },
    // }),
    admin({ adminRoles: ["admin"], defaultRole: "parent" }),
    nextCookies(), // должен оставаться последним
  ],
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
});

export type Session = typeof auth.$Infer.Session;
