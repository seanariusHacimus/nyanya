"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  specialistProfiles,
  payments,
  contactUnlocks,
  favorites,
  notifications,
} from "@/db/schema";
import { paymentProvider, UNLOCK_FEE, PROVIDER_NAME } from "@/lib/providers/payment";
import { computeTrustScore } from "@/lib/trust-score";
import { uuidSchema } from "@/lib/validation";

async function currentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export async function unlockContact(specialistId: string) {
  if (!uuidSchema.safeParse(specialistId).success)
    return { ok: false as const, reason: "notfound" as const };
  const user = await currentUser();
  if (!user) return { ok: false as const, reason: "auth" as const };

  const [existing] = await db
    .select({ id: contactUnlocks.id })
    .from(contactUnlocks)
    .where(
      and(
        eq(contactUnlocks.parentId, user.id),
        eq(contactUnlocks.specialistId, specialistId),
      ),
    )
    .limit(1);
  if (existing) return { ok: true as const };

  const [spec] = await db
    .select()
    .from(specialistProfiles)
    .where(eq(specialistProfiles.id, specialistId))
    .limit(1);
  // Only active, published profiles can be unlocked.
  if (!spec || spec.status !== "active")
    return { ok: false as const, reason: "notfound" as const };

  const charge = await paymentProvider.createCharge({
    userId: user.id,
    purpose: "contact_unlock",
    amount: UNLOCK_FEE,
    metadata: { specialistId },
  });

  const [payment] = await db
    .insert(payments)
    .values({
      userId: user.id,
      purpose: "contact_unlock",
      amount: UNLOCK_FEE,
      provider: PROVIDER_NAME,
      providerTxnId: charge.providerTxnId,
      status: charge.status === "paid" ? "paid" : "failed",
      relatedSpecialistId: specialistId,
      paidAt: charge.status === "paid" ? new Date() : null,
    })
    .returning();

  if (charge.status !== "paid") return { ok: false as const, reason: "payment" as const };

  // Idempotent on the unique (parent, specialist) constraint.
  try {
    await db
      .insert(contactUnlocks)
      .values({ parentId: user.id, specialistId, paymentId: payment.id });
  } catch {
    return { ok: true as const };
  }

  const newUnlockCount = (spec.unlockCount ?? 0) + 1;
  const monthsSince = spec.publishedAt
    ? (Date.now() - spec.publishedAt.getTime()) / (30 * 86400000)
    : 0;
  const trustScore = computeTrustScore({
    verificationLevel: spec.verificationLevel,
    unlockCount: newUnlockCount,
    monthsSincePublished: monthsSince,
    reviewCount: spec.reviewCount,
    ratingAvg: Number(spec.ratingAvg),
  });
  await db
    .update(specialistProfiles)
    .set({ unlockCount: newUnlockCount, trustScore })
    .where(eq(specialistProfiles.id, specialistId));

  await db.insert(notifications).values({
    userId: spec.userId,
    type: "contact_unlocked",
    title: "Ваши контакты открыли",
    body: "Родитель получил доступ к вашим контактам.",
  });

  revalidatePath(`/catalog/${specialistId}`);
  return { ok: true as const };
}

export async function toggleFavorite(specialistId: string) {
  if (!uuidSchema.safeParse(specialistId).success)
    return { ok: false as const, reason: "notfound" as const };
  const user = await currentUser();
  if (!user) return { ok: false as const, reason: "auth" as const };

  const [existing] = await db
    .select({ specialistId: favorites.specialistId })
    .from(favorites)
    .where(
      and(
        eq(favorites.parentId, user.id),
        eq(favorites.specialistId, specialistId),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .delete(favorites)
      .where(
        and(
          eq(favorites.parentId, user.id),
          eq(favorites.specialistId, specialistId),
        ),
      );
    return { ok: true as const, favorited: false };
  }

  await db.insert(favorites).values({ parentId: user.id, specialistId });
  return { ok: true as const, favorited: true };
}
