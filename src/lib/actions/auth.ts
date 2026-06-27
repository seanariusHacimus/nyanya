"use server";

import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { user } from "@/db/auth-schema";
import { smsProvider, DEV_OTP } from "@/lib/providers/sms";

async function requireUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session.user.id;
}

/** Promote the current account to a specialist (account type, not a privilege). */
export async function setSpecialistRole() {
  const id = await requireUserId();
  await db.update(user).set({ role: "specialist" }).where(eq(user.id, id));
}

/** Mock "send OTP": logs the dev code via the SMS provider. */
export async function sendOtpMock() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  await smsProvider.sendOtp(session.user.phone ?? "unknown", DEV_OTP);
  return { ok: true };
}

/** Mock verify: accept the dev code and mark the phone verified. */
export async function verifyPhoneMock(code: string) {
  const id = await requireUserId();
  if (code.trim() !== DEV_OTP) return { ok: false as const };
  await db.update(user).set({ phoneVerified: true }).where(eq(user.id, id));
  return { ok: true as const };
}
