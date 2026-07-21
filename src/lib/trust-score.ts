import { clampScore } from "./format";
import type { VerificationLevel } from "./constants";

export interface TrustScoreInputs {
  verificationLevel: VerificationLevel;
  /** number of opened contacts */
  unlockCount: number;
  monthsSincePublished: number;
  reviewCount: number;
  /** average rating, 0..5 */
  ratingAvg: number;
}

/** Tunable weights (plan §10), sum = 100. */
export const TRUST_WEIGHTS = {
  verification: 40,
  unlocks: 25,
  age: 15,
  engagement: 20,
} as const;

/**
 * Automatic trust indicator 0..100 (ТЗ §8). Pure and deterministic so it can be
 * unit-tested and recomputed on any relevant event.
 */
export function computeTrustScore(i: TrustScoreInputs): number {
  const verification =
    i.verificationLevel === "premium_verified"
      ? 1
      : i.verificationLevel === "verified"
        ? 0.65
        : 0.15;

  const unlocks = Math.min(i.unlockCount / 40, 1); // saturates at 40 opened contacts
  const age = Math.min(i.monthsSincePublished / 24, 1); // saturates at 2 years
  const engagement = Math.min(i.reviewCount / 15, 1) * (i.ratingAvg / 5);

  const score =
    verification * TRUST_WEIGHTS.verification +
    unlocks * TRUST_WEIGHTS.unlocks +
    age * TRUST_WEIGHTS.age +
    engagement * TRUST_WEIGHTS.engagement;

  return clampScore(score);
}
