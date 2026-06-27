export const CATEGORIES = ["nanny", "caregiver", "tutor", "driver"] as const;
export type Category = (typeof CATEGORIES)[number];

export const VERIFICATION_LEVELS = [
  "unverified",
  "verified",
  "premium_verified",
] as const;
export type VerificationLevel = (typeof VERIFICATION_LEVELS)[number];

export const PROFILE_STATUSES = [
  "draft",
  "pending_review",
  "active",
  "hidden",
  "rejected",
] as const;
export type ProfileStatus = (typeof PROFILE_STATUSES)[number];

export const PRICE_UNITS = ["hour", "day", "month"] as const;
export type PriceUnit = (typeof PRICE_UNITS)[number];

export const ENGLISH_LEVELS = ["none", "basic", "fluent"] as const;
export type EnglishLevel = (typeof ENGLISH_LEVELS)[number];

/** Categories that require medical certificates during verification (ТЗ). */
export const MEDICAL_REQUIRED: Category[] = ["nanny", "caregiver"];
