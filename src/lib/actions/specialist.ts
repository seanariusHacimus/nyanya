"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { cities, specialistProfiles, user } from "@/db/schema";
import type { Category, PriceUnit, EnglishLevel } from "@/lib/constants";
import { profileInputSchema } from "@/lib/validation";

export interface ProfileInput {
  category: Category;
  fullName: string;
  birthDate?: string;
  districtId?: number;
  experienceYears: number;
  education?: string;
  languages: string[];
  priceAmount: number;
  priceUnit: PriceUnit;
  description?: string;
  englishLevel: EnglishLevel;
  hasCar: boolean;
  liveIn: boolean;
  nightAvailable: boolean;
  newbornExp: boolean;
}

export async function saveSpecialistProfile(input: ProfileInput) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false as const, reason: "auth" as const };

  const parsed = profileInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, reason: "invalid" as const };
  const data = parsed.data;
  const userId = session.user.id;

  // Tashkent-only launch: every profile is pinned to Tashkent; specialists pick a district.
  const [tashkent] = await db
    .select({ id: cities.id })
    .from(cities)
    .orderBy(asc(cities.id))
    .limit(1);
  const tashkentCityId = tashkent?.id ?? null;

  // Becoming a specialist if not already.
  await db.update(user).set({ role: "specialist" }).where(eq(user.id, userId));

  const values = {
    category: data.category,
    fullName: data.fullName,
    birthDate: data.birthDate || null,
    cityId: tashkentCityId,
    districtId: data.districtId ?? null,
    experienceYears: data.experienceYears,
    education: data.education ?? null,
    languages: data.languages,
    priceAmount: data.priceAmount,
    priceUnit: data.priceUnit,
    description: data.description ?? null,
    englishLevel: data.englishLevel,
    hasCar: data.hasCar,
    liveIn: data.liveIn,
    nightAvailable: data.nightAvailable,
    newbornExp: data.newbornExp,
    status: "pending_review" as const,
    updatedAt: new Date(),
  };

  const [existing] = await db
    .select({ id: specialistProfiles.id })
    .from(specialistProfiles)
    .where(eq(specialistProfiles.userId, userId))
    .limit(1);

  if (existing) {
    await db
      .update(specialistProfiles)
      .set(values)
      .where(eq(specialistProfiles.id, existing.id));
  } else {
    await db.insert(specialistProfiles).values({ userId, ...values });
  }

  revalidatePath("/specialist");
  return { ok: true as const };
}
