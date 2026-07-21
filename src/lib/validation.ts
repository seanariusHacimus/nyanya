import { z } from "zod";
import {
  CATEGORIES,
  PRICE_UNITS,
  ENGLISH_LEVELS,
  VERIFICATION_LEVELS,
  PROFILE_STATUSES,
} from "@/lib/constants";

/**
 * Server-side input validation for the server-action surface. Server actions are
 * a public RPC endpoint — clients can post arbitrary payloads — so every mutating
 * action validates its input here regardless of the TypeScript types.
 */
export const uuidSchema = z.string().uuid();
export const verificationLevelSchema = z.enum(VERIFICATION_LEVELS);
export const profileStatusSchema = z.enum(PROFILE_STATUSES);

export const profileInputSchema = z.object({
  category: z.enum(CATEGORIES),
  fullName: z.string().trim().min(2).max(120),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  cityId: z.number().int().positive().optional(),
  districtId: z.number().int().positive().optional(),
  experienceYears: z.number().int().min(0).max(60),
  education: z.string().trim().max(200).optional(),
  languages: z.array(z.string().trim().max(40)).max(10),
  priceAmount: z.number().int().min(0).max(100_000_000),
  priceUnit: z.enum(PRICE_UNITS),
  description: z.string().trim().max(2000).optional(),
  englishLevel: z.enum(ENGLISH_LEVELS),
  hasCar: z.boolean(),
  liveIn: z.boolean(),
  nightAvailable: z.boolean(),
  newbornExp: z.boolean(),
});

export const otpCodeSchema = z.string().trim().regex(/^\d{4,6}$/);
