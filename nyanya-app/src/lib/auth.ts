import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, emailOTP } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import { user, session, account, verification } from "@/db/auth-schema";
import { sendOtpEmail } from "@/lib/email";

/**
 * Вход и регистрация — без паролей: одноразовый код на почту (email-OTP).
 * Роли: parent (по умолчанию) · specialist · admin (только вручную/сидом).
 * Конфигурация портирована из проверенного legacy-приложения.
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
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 300, // 5 минут — как в письме
      async sendVerificationOTP({ email, otp }) {
        await sendOtpEmail(email, otp);
      },
    }),
    admin({ adminRoles: ["admin"], defaultRole: "parent" }),
    nextCookies(), // должен оставаться последним
  ],
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
});

export type Session = typeof auth.$Infer.Session;
