"use server";

import crypto from "node:crypto";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { hashPassword } from "better-auth/crypto";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { user, account } from "@/db/auth-schema";
import { sendWelcomeEmail } from "@/lib/email";
import { isValidPhone, normalizePhone } from "@/lib/sms/phone";

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(7).max(20).refine(isValidPhone, "не похоже на узбекский номер"),
  role: z.enum(["parent", "specialist"]), // admin — только сидом, из формы недоступен
  password: z.string().min(8).max(200),
});

/**
 * Завершение регистрации после подтверждения почты кодом.
 *
 * К этому моменту `signIn.emailOtp` уже завёл аккаунт и открыл сессию, но
 * пароля у него нет — только подтверждённая почта. Здесь задаются имя,
 * телефон, роль и пароль, которым пользователь будет входить дальше.
 *
 * Пароль заводится тут, а не через Better Auth: публичного эндпоинта
 * «задать пароль» у неё нет (`/change-password` требует текущий, а
 * `setUserPassword` — права администратора). Хеш считает её же функция,
 * чтобы формат совпадал с тем, что проверяется при входе.
 *
 * Пароль принимается только если его ещё нет: иначе действие превратилось
 * бы в смену пароля без знания текущего.
 */
export async function completeProfile(input: unknown) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "invalid" as const };

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false as const, error: "unauthorized" as const };

  const [current] = await db
    .select({ role: user.role, phone: user.phone })
    .from(user)
    .where(eq(user.id, session.user.id));

  // Храним номер в одном виде: подтверждение телефона сравнивает номера
  // строками, и «+998 90 …» рядом с «998…» означало бы два человека вместо
  // одного.
  const phone = normalizePhone(parsed.data.phone);

  if (!current) return { ok: false as const, error: "unauthorized" as const };

  const isFreshAccount = current.role === "parent" && !current.phone;

  await db
    .update(user)
    .set({
      name: parsed.data.name,
      phone,
      // сменили номер — старое подтверждение к нему не относится, иначе в
      // кабинете висело бы «Телефон подтверждён» на номере, который никто
      // не подтверждал
      ...(current.phone && current.phone !== phone
        ? { phoneVerified: false }
        : {}),
      // повышение до специалиста — только при первичном заполнении профиля
      ...(isFreshAccount ? { role: parsed.data.role } : {}),
      updatedAt: new Date(),
    })
    .where(eq(user.id, session.user.id));

  const [existingCredential] = await db
    .select({ id: account.id, password: account.password })
    .from(account)
    .where(
      and(
        eq(account.userId, session.user.id),
        eq(account.providerId, "credential")
      )
    )
    .limit(1);

  if (!existingCredential?.password) {
    const hash = await hashPassword(parsed.data.password);
    if (existingCredential) {
      await db
        .update(account)
        .set({ password: hash, updatedAt: new Date() })
        .where(eq(account.id, existingCredential.id));
    } else {
      await db.insert(account).values({
        id: crypto.randomUUID(),
        accountId: session.user.id,
        providerId: "credential",
        userId: session.user.id,
        password: hash,
      });
    }
  }

  const role = isFreshAccount ? parsed.data.role : current.role;

  // Приветственное письмо — только при первичном заполнении профиля, иначе
  // оно уходило бы при каждом изменении имени или телефона.
  if (isFreshAccount) {
    await sendWelcomeEmail(
      session.user.email,
      parsed.data.name,
      role === "specialist" ? "specialist" : "parent"
    );
  }

  return { ok: true as const, role };
}
