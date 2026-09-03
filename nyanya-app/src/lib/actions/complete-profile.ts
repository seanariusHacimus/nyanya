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

const schema = z
  .object({
    /**
     * Семья называет имя здесь. Специалист — нет: его паспортное имя
     * спрашивает второй экран анкеты, и спрашивать дважды за минуту значило
     * заставлять человека думать, что первый ответ не сохранился.
     */
    name: z.string().trim().max(100).optional().default(""),
    phone: z.string().trim().min(7).max(20),
    role: z.enum(["parent", "specialist"]), // admin — только сидом, из формы недоступен
    password: z.string().min(8).max(200),
  })
  .superRefine((value, ctx) => {
    if (value.role === "parent" && value.name.length === 0) {
      ctx.addIssue({ code: "custom", path: ["name"], message: "name_required" });
    }
  });

/**
 * Заведён ли уже аккаунт, в который открыта текущая сессия.
 *
 * `signIn.emailOtp` не различает вход и регистрацию: код, отправленный на уже
 * известную почту, открывает сессию существующего аккаунта. Форма регистрации
 * после этого показывала третий шаг и спрашивала имя, телефон и пароль заново —
 * имя с телефоном она перезаписывала, а пароль оставляла прежним (он ставится
 * только когда его нет). Человек, пришедший «зарегистрироваться заново» из-за
 * забытого пароля, терял имя и телефон и всё равно не мог войти. Для
 * специалиста с опубликованной анкетой это ещё и стёртый номер, по которому с
 * ним связываются семьи.
 *
 * Признак — заданный пароль, а не заполненный профиль: третий шаг регистрации
 * существует ровно ради пароля, и если он уже есть, спрашивать нечего.
 */
export async function registrationState(): Promise<
  { ok: false } | { ok: true; established: boolean; role: string }
> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false };

  const [credential] = await db
    .select({ password: account.password })
    .from(account)
    .where(
      and(
        eq(account.userId, session.user.id),
        eq(account.providerId, "credential")
      )
    )
    .limit(1);

  return {
    ok: true,
    established: Boolean(credential?.password),
    role: session.user.role ?? "parent",
  };
}

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

  if (!current) return { ok: false as const, error: "unauthorized" as const };

  const isFreshAccount = current.role === "parent" && !current.phone;

  await db
    .update(user)
    .set({
      // пустое имя специалиста не должно затирать уже известное
      ...(parsed.data.name ? { name: parsed.data.name } : {}),
      phone: parsed.data.phone,
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
