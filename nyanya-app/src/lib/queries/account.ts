import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  specialistProfiles,
  districts,
  favorites,
  contactUnlocks,
  user,
} from "@/db/schema";
import { getNotifications, type UiNotification } from "@/lib/queries/notifications";
import {
  buildContacts,
  categories,
  type SpecialistContacts,
  type UiSpecialist,
  type CategoryKey,
} from "@/lib/specialists-shared";

/** §11 — данные кабинета заказчика из PostgreSQL. */

const englishLabels = { none: "Нет", basic: "Базовый", fluent: "Свободный" } as const;

function age(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const born = new Date(birthDate);
  const now = new Date();
  let years = now.getFullYear() - born.getFullYear();
  if (
    now.getMonth() < born.getMonth() ||
    (now.getMonth() === born.getMonth() && now.getDate() < born.getDate())
  )
    years -= 1;
  return years;
}

type ProfileRow = typeof specialistProfiles.$inferSelect;

function toUi(row: ProfileRow, districtName: string | null): UiSpecialist {
  const attributes: string[] = [];
  if (row.hasCar) attributes.push("Свой автомобиль");
  if (row.liveIn) attributes.push("С проживанием");
  if (row.nightAvailable) attributes.push("Ночные смены");
  if (row.newbornExp) attributes.push("Опыт с новорождёнными");

  return {
    slug: row.slug ?? row.id,
    name: row.fullName,
    age: age(row.birthDate),
    category: row.category as CategoryKey,
    district: districtName ?? "Ташкент",
    experienceYears: row.experienceYears,
    rating: Number(row.ratingAvg),
    reviewCount: row.reviewCount,
    priceFrom: row.priceAmount,
    priceUnit: row.priceUnit === "day" ? "день" : "час",
    trustScore: row.trustScore,
    verification:
      row.verificationLevel === "premium_verified" ? "premium" : "verified",
    languages: row.languages ?? [],
    english: englishLabels[row.englishLevel] ?? "Нет",
    education: row.education ?? "",
    attributes,
    about: (row.description ?? "").split("\n\n").filter(Boolean),
    photoUrl: row.photoKey,
  };
}

export type UnlockedRow = {
  specialist: UiSpecialist;
  categoryLabel: string;
  unlockedAt: string;
  contacts: SpecialistContacts;
};

export type { UiNotification };

export type AccountData = {
  favorites: UiSpecialist[];
  unlocked: UnlockedRow[];
  notifications: UiNotification[];
};

export async function getAccountData(userId: string): Promise<AccountData> {
  const [favoriteRows, unlockRows, notificationRows] = await Promise.all([
    db
      .select({ profile: specialistProfiles, districtName: districts.nameRu })
      .from(favorites)
      .innerJoin(
        specialistProfiles,
        eq(specialistProfiles.id, favorites.specialistId)
      )
      .leftJoin(districts, eq(districts.id, specialistProfiles.districtId))
      .where(eq(favorites.parentId, userId))
      .orderBy(desc(favorites.createdAt)),

    db
      .select({
        profile: specialistProfiles,
        districtName: districts.nameRu,
        unlockedAt: contactUnlocks.unlockedAt,
        ownerPhone: user.phone,
      })
      .from(contactUnlocks)
      .innerJoin(
        specialistProfiles,
        eq(specialistProfiles.id, contactUnlocks.specialistId)
      )
      .innerJoin(user, eq(user.id, specialistProfiles.userId))
      .leftJoin(districts, eq(districts.id, specialistProfiles.districtId))
      .where(eq(contactUnlocks.parentId, userId))
      .orderBy(desc(contactUnlocks.unlockedAt)),

    getNotifications(userId),
  ]);

  return {
    favorites: favoriteRows.map((r) => toUi(r.profile, r.districtName)),
    unlocked: unlockRows.map((r) => {
      const specialist = toUi(r.profile, r.districtName);
      return {
        specialist,
        categoryLabel: categories[specialist.category].label,
        unlockedAt: r.unlockedAt.toISOString(),
        contacts: buildContacts(r.ownerPhone ?? "", specialist.slug),
      };
    }),
    notifications: notificationRows,
  };
}

/** Список slug'ов избранного — для подсветки сердечек в каталоге. */
export async function getFavoriteSlugs(userId: string): Promise<string[]> {
  const rows = await db
    .select({ slug: specialistProfiles.slug })
    .from(favorites)
    .innerJoin(
      specialistProfiles,
      eq(specialistProfiles.id, favorites.specialistId)
    )
    .where(eq(favorites.parentId, userId));
  return rows.map((r) => r.slug).filter((s): s is string => Boolean(s));
}

/** Проверка, что анкета принадлежит пользователю (для кабинета специалиста). */
export async function getOwnProfile(userId: string) {
  const rows = await db
    .select()
    .from(specialistProfiles)
    .where(eq(specialistProfiles.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

