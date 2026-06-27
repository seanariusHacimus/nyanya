import {
  and,
  eq,
  gte,
  lte,
  desc,
  asc,
  ilike,
  arrayContains,
  sql,
} from "drizzle-orm";
import { db } from "@/db";
import {
  specialistProfiles,
  cities,
  districts,
  reviews,
  contactUnlocks,
  favorites,
  notifications,
  user,
} from "@/db/schema";
import type { Category } from "@/lib/constants";

export interface CatalogFilters {
  category?: Category;
  cityId?: number;
  districtId?: number;
  minExperience?: number;
  maxPrice?: number;
  language?: string;
  english?: boolean;
  hasCar?: boolean;
  liveIn?: boolean;
  nightAvailable?: boolean;
  newborn?: boolean;
  q?: string;
  sort?: "trust" | "price_asc" | "price_desc" | "experience";
}

const catalogFields = {
  id: specialistProfiles.id,
  category: specialistProfiles.category,
  fullName: specialistProfiles.fullName,
  photoKey: specialistProfiles.photoKey,
  birthDate: specialistProfiles.birthDate,
  experienceYears: specialistProfiles.experienceYears,
  priceAmount: specialistProfiles.priceAmount,
  priceUnit: specialistProfiles.priceUnit,
  trustScore: specialistProfiles.trustScore,
  verificationLevel: specialistProfiles.verificationLevel,
  ratingAvg: specialistProfiles.ratingAvg,
  reviewCount: specialistProfiles.reviewCount,
  languages: specialistProfiles.languages,
  hasCar: specialistProfiles.hasCar,
  liveIn: specialistProfiles.liveIn,
  nightAvailable: specialistProfiles.nightAvailable,
  newbornExp: specialistProfiles.newbornExp,
  englishLevel: specialistProfiles.englishLevel,
  cityNameRu: cities.nameRu,
  cityNameUz: cities.nameUz,
  cityNameEn: cities.nameEn,
  districtNameRu: districts.nameRu,
  districtNameUz: districts.nameUz,
  districtNameEn: districts.nameEn,
};

export async function getCatalog(f: CatalogFilters = {}) {
  const conds = [eq(specialistProfiles.status, "active")];
  if (f.category) conds.push(eq(specialistProfiles.category, f.category));
  if (f.cityId) conds.push(eq(specialistProfiles.cityId, f.cityId));
  if (f.districtId) conds.push(eq(specialistProfiles.districtId, f.districtId));
  if (f.minExperience)
    conds.push(gte(specialistProfiles.experienceYears, f.minExperience));
  if (f.maxPrice) conds.push(lte(specialistProfiles.priceAmount, f.maxPrice));
  if (f.language)
    conds.push(arrayContains(specialistProfiles.languages, [f.language]));
  if (f.english) conds.push(sql`${specialistProfiles.englishLevel} <> 'none'`);
  if (f.hasCar) conds.push(eq(specialistProfiles.hasCar, true));
  if (f.liveIn) conds.push(eq(specialistProfiles.liveIn, true));
  if (f.nightAvailable) conds.push(eq(specialistProfiles.nightAvailable, true));
  if (f.newborn) conds.push(eq(specialistProfiles.newbornExp, true));
  if (f.q) conds.push(ilike(specialistProfiles.fullName, `%${f.q}%`));

  const order =
    f.sort === "price_asc"
      ? asc(specialistProfiles.priceAmount)
      : f.sort === "price_desc"
        ? desc(specialistProfiles.priceAmount)
        : f.sort === "experience"
          ? desc(specialistProfiles.experienceYears)
          : desc(specialistProfiles.trustScore);

  return db
    .select(catalogFields)
    .from(specialistProfiles)
    .leftJoin(cities, eq(cities.id, specialistProfiles.cityId))
    .leftJoin(districts, eq(districts.id, specialistProfiles.districtId))
    .where(and(...conds))
    .orderBy(order);
}

export type CatalogItem = Awaited<ReturnType<typeof getCatalog>>[number];

export async function getSpecialistById(id: string) {
  const [row] = await db
    .select({
      ...catalogFields,
      userId: specialistProfiles.userId,
      description: specialistProfiles.description,
      descriptionUz: specialistProfiles.descriptionUz,
      descriptionEn: specialistProfiles.descriptionEn,
      education: specialistProfiles.education,
      educationUz: specialistProfiles.educationUz,
      educationEn: specialistProfiles.educationEn,
      videoIntroKey: specialistProfiles.videoIntroKey,
      unlockCount: specialistProfiles.unlockCount,
      status: specialistProfiles.status,
    })
    .from(specialistProfiles)
    .leftJoin(cities, eq(cities.id, specialistProfiles.cityId))
    .leftJoin(districts, eq(districts.id, specialistProfiles.districtId))
    .where(eq(specialistProfiles.id, id))
    .limit(1);
  return row ?? null;
}

export type SpecialistDetail = NonNullable<
  Awaited<ReturnType<typeof getSpecialistById>>
>;

/** Contact details, revealed only after an unlock (server-gated). */
export async function getSpecialistContacts(userId: string) {
  const [u] = await db
    .select({ phone: user.phone, name: user.name })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return u ?? null;
}

export async function getReviews(specialistId: string) {
  return db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      text: reviews.text,
      textUz: reviews.textUz,
      textEn: reviews.textEn,
      createdAt: reviews.createdAt,
      authorName: user.name,
    })
    .from(reviews)
    .leftJoin(user, eq(user.id, reviews.authorParentId))
    .where(
      and(eq(reviews.specialistId, specialistId), eq(reviews.status, "visible")),
    )
    .orderBy(desc(reviews.createdAt));
}

export async function isUnlocked(parentId: string, specialistId: string) {
  const [row] = await db
    .select({ id: contactUnlocks.id })
    .from(contactUnlocks)
    .where(
      and(
        eq(contactUnlocks.parentId, parentId),
        eq(contactUnlocks.specialistId, specialistId),
      ),
    )
    .limit(1);
  return !!row;
}

export async function isFavorite(parentId: string, specialistId: string) {
  const [row] = await db
    .select({ specialistId: favorites.specialistId })
    .from(favorites)
    .where(
      and(
        eq(favorites.parentId, parentId),
        eq(favorites.specialistId, specialistId),
      ),
    )
    .limit(1);
  return !!row;
}

export async function getSpecialistByUserId(userId: string) {
  const [row] = await db
    .select()
    .from(specialistProfiles)
    .where(eq(specialistProfiles.userId, userId))
    .limit(1);
  return row ?? null;
}

export async function getFavorites(parentId: string) {
  return db
    .select(catalogFields)
    .from(favorites)
    .innerJoin(
      specialistProfiles,
      eq(specialistProfiles.id, favorites.specialistId),
    )
    .leftJoin(cities, eq(cities.id, specialistProfiles.cityId))
    .leftJoin(districts, eq(districts.id, specialistProfiles.districtId))
    .where(eq(favorites.parentId, parentId))
    .orderBy(desc(favorites.createdAt));
}

export async function getNotifications(userId: string) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
}

export async function getCities() {
  return db.select().from(cities).orderBy(asc(cities.id));
}

export async function getDistricts() {
  return db.select().from(districts).orderBy(asc(districts.id));
}
