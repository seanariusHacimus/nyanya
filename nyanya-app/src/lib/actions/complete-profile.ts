"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { user } from "@/db/auth-schema";

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(7).max(20),
  role: z.enum(["parent", "specialist"]), // admin — только сидом, из формы недоступен
});

/**
 * Завершение регистрации после первого входа по email-OTP:
 * задаёт имя, телефон и роль. Роль можно установить только один раз —
 * пока аккаунт «свежий» (роль по умолчанию и телефон ещё не заполнен).
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
      name: parsed.data.name,
      phone: parsed.data.phone,
      // повышение до специалиста — только при первичном заполнении профиля
      ...(isFreshAccount ? { role: parsed.data.role } : {}),
      updatedAt: new Date(),
    })
    .where(eq(user.id, session.user.id));

  const role = isFreshAccount ? parsed.data.role : current.role;
  return { ok: true as const, role };
}
