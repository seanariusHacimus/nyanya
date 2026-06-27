import { sql, eq, desc, count } from "drizzle-orm";
import { db } from "@/db";
import {
  user,
  specialistProfiles,
  payments,
  contactUnlocks,
  complaints,
} from "@/db/schema";

export async function getAdminStats() {
  const [parents] = await db
    .select({ n: count() })
    .from(user)
    .where(eq(user.role, "parent"));
  const [specialists] = await db
    .select({ n: count() })
    .from(specialistProfiles);
  const [paid] = await db
    .select({
      n: count(),
      sum: sql<number>`coalesce(sum(${payments.amount}), 0)`,
    })
    .from(payments)
    .where(eq(payments.status, "paid"));
  const [unlocks] = await db.select({ n: count() }).from(contactUnlocks);
  const [openComplaints] = await db
    .select({ n: count() })
    .from(complaints)
    .where(eq(complaints.status, "open"));

  return {
    parents: parents.n,
    specialists: specialists.n,
    payments: paid.n,
    revenue: Number(paid.sum),
    unlocks: unlocks.n,
    complaints: openComplaints.n,
    conversion: parents.n ? Math.round((unlocks.n / parents.n) * 100) : 0,
  };
}

export async function getAdminSpecialists() {
  return db
    .select({
      id: specialistProfiles.id,
      fullName: specialistProfiles.fullName,
      category: specialistProfiles.category,
      status: specialistProfiles.status,
      verificationLevel: specialistProfiles.verificationLevel,
      trustScore: specialistProfiles.trustScore,
      unlockCount: specialistProfiles.unlockCount,
      photoKey: specialistProfiles.photoKey,
    })
    .from(specialistProfiles)
    .orderBy(desc(specialistProfiles.createdAt));
}

export async function getAdminUsers() {
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      banned: user.banned,
    })
    .from(user)
    .orderBy(desc(user.createdAt))
    .limit(60);
}
