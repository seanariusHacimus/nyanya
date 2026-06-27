import {
  pgTable,
  pgEnum,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
  serial,
  date,
  jsonb,
  numeric,
  primaryKey,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export * from "./auth-schema";

/* ----------------------------- enums ----------------------------- */
export const categoryEnum = pgEnum("category", [
  "nanny",
  "caregiver",
  "tutor",
  "driver",
]);
export const priceUnitEnum = pgEnum("price_unit", ["hour", "day", "month"]);
export const englishLevelEnum = pgEnum("english_level", [
  "none",
  "basic",
  "fluent",
]);
export const profileStatusEnum = pgEnum("profile_status", [
  "draft",
  "pending_review",
  "active",
  "hidden",
  "rejected",
]);
export const verificationLevelEnum = pgEnum("verification_level", [
  "unverified",
  "verified",
  "premium_verified",
]);
export const documentTypeEnum = pgEnum("document_type", [
  "passport",
  "selfie",
  "video_intro",
  "profile_photo",
  "recommendation",
  "medical_general",
  "medical_psychiatrist",
  "medical_tb_aids",
  "other",
]);
export const documentStatusEnum = pgEnum("document_status", [
  "pending",
  "approved",
  "rejected",
]);
export const paymentPurposeEnum = pgEnum("payment_purpose", [
  "specialist_listing",
  "contact_unlock",
  "unlock_package",
  "subscription",
]);
export const paymentProviderEnum = pgEnum("payment_provider", [
  "mock",
  "payme",
  "click",
  "uzum",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "paid",
  "failed",
  "refunded",
]);
export const complaintCategoryEnum = pgEnum("complaint_category", [
  "fake_profile",
  "fraud",
  "spam",
  "misconduct",
  "other",
]);
export const complaintStatusEnum = pgEnum("complaint_status", [
  "open",
  "reviewing",
  "resolved",
  "dismissed",
]);
export const reviewStatusEnum = pgEnum("review_status", ["visible", "hidden"]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "verification_status",
  "new_review",
  "contact_unlocked",
  "listing_published",
  "system",
]);

/* ------------------------ reference data ------------------------ */
export const cities = pgTable("cities", {
  id: serial("id").primaryKey(),
  nameRu: text("name_ru").notNull(),
  nameUz: text("name_uz").notNull(),
  nameEn: text("name_en").notNull(),
});

export const districts = pgTable("districts", {
  id: serial("id").primaryKey(),
  cityId: integer("city_id")
    .notNull()
    .references(() => cities.id, { onDelete: "cascade" }),
  nameRu: text("name_ru").notNull(),
  nameUz: text("name_uz").notNull(),
  nameEn: text("name_en").notNull(),
});

/* ---------------------- specialist profiles --------------------- */
export const specialistProfiles = pgTable(
  "specialist_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" })
      .unique(),
    category: categoryEnum("category").notNull(),
    fullName: text("full_name").notNull(),
    photoKey: text("photo_key"),
    birthDate: date("birth_date"),
    cityId: integer("city_id").references(() => cities.id),
    districtId: integer("district_id").references(() => districts.id),
    experienceYears: integer("experience_years").notNull().default(0),
    education: text("education"),
    educationUz: text("education_uz"),
    educationEn: text("education_en"),
    languages: text("languages").array().notNull().default([]),
    priceAmount: integer("price_amount").notNull().default(0),
    priceUnit: priceUnitEnum("price_unit").notNull().default("hour"),
    description: text("description"),
    descriptionUz: text("description_uz"),
    descriptionEn: text("description_en"),
    videoIntroKey: text("video_intro_key"),
    hasCar: boolean("has_car").notNull().default(false),
    liveIn: boolean("live_in").notNull().default(false),
    nightAvailable: boolean("night_available").notNull().default(false),
    newbornExp: boolean("newborn_exp").notNull().default(false),
    englishLevel: englishLevelEnum("english_level").notNull().default("none"),
    status: profileStatusEnum("status").notNull().default("draft"),
    verificationLevel: verificationLevelEnum("verification_level")
      .notNull()
      .default("unverified"),
    trustScore: integer("trust_score").notNull().default(0),
    employed: boolean("employed").notNull().default(false),
    ratingAvg: numeric("rating_avg", { precision: 3, scale: 2 })
      .notNull()
      .default("0"),
    reviewCount: integer("review_count").notNull().default(0),
    unlockCount: integer("unlock_count").notNull().default(0),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("specialist_category_idx").on(t.category),
    index("specialist_status_idx").on(t.status),
    index("specialist_city_idx").on(t.cityId),
  ],
);

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  specialistId: uuid("specialist_id")
    .notNull()
    .references(() => specialistProfiles.id, { onDelete: "cascade" }),
  type: documentTypeEnum("type").notNull(),
  fileKey: text("file_key").notNull(),
  status: documentStatusEnum("status").notNull().default("pending"),
  reviewedBy: text("reviewed_by").references(() => user.id),
  reviewNote: text("review_note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  purpose: paymentPurposeEnum("purpose").notNull(),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("UZS"),
  provider: paymentProviderEnum("provider").notNull().default("mock"),
  providerTxnId: text("provider_txn_id"),
  status: paymentStatusEnum("status").notNull().default("pending"),
  relatedSpecialistId: uuid("related_specialist_id").references(
    () => specialistProfiles.id,
    { onDelete: "set null" },
  ),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  paidAt: timestamp("paid_at"),
  raw: jsonb("raw"),
});

export const contactUnlocks = pgTable(
  "contact_unlocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    parentId: text("parent_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    specialistId: uuid("specialist_id")
      .notNull()
      .references(() => specialistProfiles.id, { onDelete: "cascade" }),
    paymentId: uuid("payment_id").references(() => payments.id, {
      onDelete: "set null",
    }),
    unlockedAt: timestamp("unlocked_at").notNull().defaultNow(),
  },
  (t) => [unique("uniq_parent_specialist_unlock").on(t.parentId, t.specialistId)],
);

export const favorites = pgTable(
  "favorites",
  {
    parentId: text("parent_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    specialistId: uuid("specialist_id")
      .notNull()
      .references(() => specialistProfiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.parentId, t.specialistId] })],
);

export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  specialistId: uuid("specialist_id")
    .notNull()
    .references(() => specialistProfiles.id, { onDelete: "cascade" }),
  authorParentId: text("author_parent_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  text: text("text"),
  textUz: text("text_uz"),
  textEn: text("text_en"),
  status: reviewStatusEnum("status").notNull().default("visible"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const complaints = pgTable("complaints", {
  id: uuid("id").primaryKey().defaultRandom(),
  reporterId: text("reporter_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  targetSpecialistId: uuid("target_specialist_id").references(
    () => specialistProfiles.id,
    { onDelete: "cascade" },
  ),
  category: complaintCategoryEnum("category").notNull(),
  text: text("text"),
  status: complaintStatusEnum("status").notNull().default("open"),
  handledBy: text("handled_by").references(() => user.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  data: jsonb("data"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  keys: jsonb("keys").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
