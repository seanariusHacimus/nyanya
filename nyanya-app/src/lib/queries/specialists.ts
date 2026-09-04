import { and, desc, eq, isNotNull, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  specialistProfiles,
  districts,
  reviews,
  user,
} from "@/db/schema";

/**
 * Чтение анкет из PostgreSQL для публичных страниц.
 * Формы данных — плоские и сериализуемые (уходят в клиентские компоненты).
 */

import {
  categories,
  formatPrice,
  buildContacts,
  type CategoryKey,
  type UiSpecialist,
  type UiReview,
  type SpecialistContacts,
  PRICE_UNIT_LABEL,
} from "@/lib/specialists-shared";
import { contactUnlocks } from "@/db/schema";

/** Контакты специалиста для уже открывшего их пользователя (иначе null). */
export async function getUnlockedContactsForUser(
  slug: string,
  userId: string
): Promise<SpecialistContacts | null> {
  const rows = await db
    .select({ phone: user.phone })
    .from(contactUnlocks)
    .innerJoin(
      specialistProfiles,
      eq(specialistProfiles.id, contactUnlocks.specialistId)
    )
    .innerJoin(user, eq(user.id, specialistProfiles.userId))
    .where(
      and(
        eq(contactUnlocks.parentId, userId),
        eq(specialistProfiles.slug, slug)
      )
    )
    .limit(1);
  const phone = rows[0]?.phone;
  return phone ? buildContacts(phone) : null;
}

export { categories, formatPrice };
export type { CategoryKey, UiSpecialist, UiReview };

const englishLabels = { none: "Нет", basic: "Базовый", fluent: "Свободный" } as const;

function age(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const born = new Date(birthDate);
  const now = new Date();
  let years = now.getFullYear() - born.getFullYear();
  const beforeBirthday =
    now.getMonth() < born.getMonth() ||
    (now.getMonth() === born.getMonth() && now.getDate() < born.getDate());
  if (beforeBirthday) years -= 1;
  return years;
}

type Row = typeof specialistProfiles.$inferSelect & { districtName: string | null };

function toUi(row: Row): UiSpecialist {
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
    district: row.districtName ?? "Ташкент",
    experienceYears: row.experienceYears,
    rating: Number(row.ratingAvg),
    reviewCount: row.reviewCount,
    priceFrom: row.priceAmount,
    // «месяц» раньше проваливался в «час»: тройку значений разбирала
    // двоичная проверка, и анкета с месячной оплатой показывала «сум/час»
    priceUnit: PRICE_UNIT_LABEL[row.priceUnit],
    // «Премиум» = документы проверил администратор. Всё остальное —
    // опубликованная анкета без проверки документов; называть её
    // «проверенной» значит обещать семье то, чего не было.
    verification:
      row.verificationLevel === "premium_verified" ? "premium" : "published",
    available: !row.employed,
    languages: row.languages ?? [],
    english: englishLabels[row.englishLevel] ?? "Нет",
    education: row.education ?? "",
    attributes,
    extraOffer: row.extraOffer ?? "",
    about: (row.description ?? "").split("\n\n").filter(Boolean),
    photoUrl: row.photoKey,
  };
}

const activeWithSlug = and(
  eq(specialistProfiles.status, "active"),
  isNotNull(specialistProfiles.slug)
);

/**
 * Что показывать в списках.
 *
 * Кроме опубликованных отсеиваем тех, кто сам отметил «сейчас не ищу работу»:
 * показывать семье человека, который заведомо не ответит, — впустую потратить
 * её время и подорвать доверие к каталогу.
 *
 * Отдельная колонка `employed`, а не статус `hidden`: скрытие статусом —
 * инструмент модератора, и специалист не должен уметь отменять его решение,
 * переключая тумблер у себя в кабинете.
 */
const listedInCatalog = and(activeWithSlug, eq(specialistProfiles.employed, false));

export async function getActiveSpecialists(): Promise<UiSpecialist[]> {
  const rows = await db
    .select({ profile: specialistProfiles, districtName: districts.nameRu })
    .from(specialistProfiles)
    .leftJoin(districts, eq(districts.id, specialistProfiles.districtId))
    .where(listedInCatalog)
    .orderBy(
      // премиум выше стандартного — обещание с плашки в кабинете; перечисление
      // enum упорядочено так, что premium_verified старше остальных
      desc(specialistProfiles.verificationLevel),
      desc(specialistProfiles.ratingAvg),
      desc(specialistProfiles.reviewCount),
      desc(specialistProfiles.publishedAt)
    );
  return rows.map((r) => toUi({ ...r.profile, districtName: r.districtName }));
}

export async function getSpecialistBySlug(
  slug: string
): Promise<(UiSpecialist & { reviews: UiReview[] }) | null> {
  const rows = await db
    .select({ profile: specialistProfiles, districtName: districts.nameRu })
    .from(specialistProfiles)
    .leftJoin(districts, eq(districts.id, specialistProfiles.districtId))
    .where(and(activeWithSlug, eq(specialistProfiles.slug, slug)))
    .limit(1);
  if (rows.length === 0) return null;

  const profileRow = rows[0];
  const reviewRows = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      text: reviews.text,
      author: user.name,
    })
    .from(reviews)
    .innerJoin(user, eq(user.id, reviews.authorParentId))
    .where(
      and(
        eq(reviews.specialistId, profileRow.profile.id),
        eq(reviews.status, "visible")
      )
    )
    .orderBy(desc(reviews.createdAt));

  return {
    ...toUi({ ...profileRow.profile, districtName: profileRow.districtName }),
    reviews: reviewRows.map((r) => ({
      id: r.id,
      rating: r.rating,
      text: r.text ?? "",
      author: r.author,
    })),
  };
}

export async function getSimilarSpecialists(
  slug: string,
  category: CategoryKey,
  count = 3
): Promise<UiSpecialist[]> {
  const same = await db
    .select({ profile: specialistProfiles, districtName: districts.nameRu })
    .from(specialistProfiles)
    .leftJoin(districts, eq(districts.id, specialistProfiles.districtId))
    .where(
      and(
        listedInCatalog,
        eq(specialistProfiles.category, category),
        ne(specialistProfiles.slug, slug)
      )
    )
    .orderBy(
      // премиум выше стандартного — обещание с плашки в кабинете; перечисление
      // enum упорядочено так, что premium_verified старше остальных
      desc(specialistProfiles.verificationLevel),
      desc(specialistProfiles.ratingAvg),
      desc(specialistProfiles.reviewCount),
      desc(specialistProfiles.publishedAt)
    )
    .limit(count);

  const result = same.map((r) =>
    toUi({ ...r.profile, districtName: r.districtName })
  );

  if (result.length < count) {
    const extra = await db
      .select({ profile: specialistProfiles, districtName: districts.nameRu })
      .from(specialistProfiles)
      .leftJoin(districts, eq(districts.id, specialistProfiles.districtId))
      .where(
        and(
          listedInCatalog,
          ne(specialistProfiles.category, category),
          ne(specialistProfiles.slug, slug)
        )
      )
      .orderBy(
      // премиум выше стандартного — обещание с плашки в кабинете; перечисление
      // enum упорядочено так, что premium_verified старше остальных
      desc(specialistProfiles.verificationLevel),
      desc(specialistProfiles.ratingAvg),
      desc(specialistProfiles.reviewCount),
      desc(specialistProfiles.publishedAt)
    )
      .limit(count - result.length);
    result.push(
      ...extra.map((r) => toUi({ ...r.profile, districtName: r.districtName }))
    );
  }

  return result;
}

