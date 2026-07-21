import { describe, it, expect } from "vitest";
import { computeTrustScore } from "./trust-score";

describe("computeTrustScore", () => {
  it("always returns a value within 0..100", () => {
    const s = computeTrustScore({
      verificationLevel: "unverified",
      unlockCount: 0,
      monthsSincePublished: 0,
      reviewCount: 0,
      ratingAvg: 0,
    });
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(100);
  });

  it("ranks premium > verified > unverified, all else equal", () => {
    const base = {
      unlockCount: 0,
      monthsSincePublished: 0,
      reviewCount: 0,
      ratingAvg: 0,
    } as const;
    const premium = computeTrustScore({ ...base, verificationLevel: "premium_verified" });
    const verified = computeTrustScore({ ...base, verificationLevel: "verified" });
    const unverified = computeTrustScore({ ...base, verificationLevel: "unverified" });
    expect(premium).toBeGreaterThan(verified);
    expect(verified).toBeGreaterThan(unverified);
  });

  it("rewards unlocks, profile age and engagement", () => {
    const low = computeTrustScore({
      verificationLevel: "verified",
      unlockCount: 0,
      monthsSincePublished: 0,
      reviewCount: 0,
      ratingAvg: 0,
    });
    const high = computeTrustScore({
      verificationLevel: "verified",
      unlockCount: 40,
      monthsSincePublished: 24,
      reviewCount: 15,
      ratingAvg: 5,
    });
    expect(high).toBeGreaterThan(low);
  });

  it("caps at 100 for a maxed-out profile", () => {
    expect(
      computeTrustScore({
        verificationLevel: "premium_verified",
        unlockCount: 100,
        monthsSincePublished: 60,
        reviewCount: 50,
        ratingAvg: 5,
      }),
    ).toBe(100);
  });

  it("is deterministic for identical inputs", () => {
    const input = {
      verificationLevel: "verified",
      unlockCount: 10,
      monthsSincePublished: 6,
      reviewCount: 5,
      ratingAvg: 4.5,
    } as const;
    expect(computeTrustScore(input)).toBe(computeTrustScore(input));
  });
});
