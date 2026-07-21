"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { specialistProfiles, user, notifications } from "@/db/schema";
import type { VerificationLevel, ProfileStatus } from "@/lib/constants";
import {
  uuidSchema,
  verificationLevelSchema,
  profileStatusSchema,
} from "@/lib/validation";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || role !== "admin") throw new Error("Forbidden");
  return session.user;
}

export async function setVerificationLevel(
  specialistId: string,
  level: VerificationLevel,
) {
  await requireAdmin();
  if (
    !uuidSchema.safeParse(specialistId).success ||
    !verificationLevelSchema.safeParse(level).success
  )
    return;
  const publish = level !== "unverified";
  const [spec] = await db
    .update(specialistProfiles)
    .set({
      verificationLevel: level,
      status: publish ? "active" : "pending_review",
      ...(publish ? { publishedAt: new Date() } : {}),
    })
    .where(eq(specialistProfiles.id, specialistId))
    .returning();
  if (spec) {
    await db.insert(notifications).values({
      userId: spec.userId,
      type: "verification_status",
      title: "Статус проверки обновлён",
      body: `Уровень верификации: ${level}`,
    });
  }
  revalidatePath("/admin");
}

export async function setProfileStatus(
  specialistId: string,
  status: ProfileStatus,
) {
  await requireAdmin();
  if (
    !uuidSchema.safeParse(specialistId).success ||
    !profileStatusSchema.safeParse(status).success
  )
    return;
  await db
    .update(specialistProfiles)
    .set({ status })
    .where(eq(specialistProfiles.id, specialistId));
  revalidatePath("/admin");
}

export async function toggleBlockUser(userId: string, banned: boolean) {
  await requireAdmin();
  if (!uuidSchema.safeParse(userId).success) return;
  await db.update(user).set({ banned }).where(eq(user.id, userId));
  revalidatePath("/admin");
}
