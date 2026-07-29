import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { specialistProfiles, documents, districts } from "@/db/schema";
import { verificationSteps } from "@/content/verification-steps";
import type { StepState } from "@/components/specialist/verification-step-card";

export type CabinetProfile = {
  fullName: string;
  category: "nanny" | "caregiver" | "tutor" | "driver";
  birthDate: string;
  districtId: number | null;
  experienceYears: number;
  education: string;
  languages: string[];
  englishLevel: "none" | "basic" | "fluent";
  priceAmount: number;
  priceUnit: "hour" | "day" | "month";
  description: string;
  hasCar: boolean;
  liveIn: boolean;
  nightAvailable: boolean;
  newbornExp: boolean;
};

export type CabinetData = {
  exists: boolean;
  status: "draft" | "pending_review" | "active" | "hidden" | "rejected";
  moderationNote: string | null;
  slug: string | null;
  trustScore: number;
  unlockCount: number;
  reviewCount: number;
  ratingAvg: number;
  profile: CabinetProfile;
  steps: Record<string, StepState>;
  districts: { id: number; name: string }[];
};

const emptyProfile: CabinetProfile = {
  fullName: "",
  category: "nanny",
  birthDate: "",
  districtId: null,
  experienceYears: 0,
  education: "",
  languages: [],
  englishLevel: "none",
  priceAmount: 0,
  priceUnit: "hour",
  description: "",
  hasCar: false,
  liveIn: false,
  nightAvailable: false,
  newbornExp: false,
};

export async function getCabinetData(
  userId: string,
  userName: string
): Promise<CabinetData> {
  const [profileRow] = await db
    .select()
    .from(specialistProfiles)
    .where(eq(specialistProfiles.userId, userId))
    .limit(1);

  const districtRows = await db
    .select({ id: districts.id, name: districts.nameRu })
    .from(districts)
    .orderBy(asc(districts.id));

  const steps: Record<string, StepState> = Object.fromEntries(
    verificationSteps.map((s) => [
      s.key,
      { status: "empty", fileName: null, fileKey: null, reviewNote: null },
    ])
  );

  if (!profileRow) {
    return {
      exists: false,
      status: "draft",
      moderationNote: null,
      slug: null,
      trustScore: 0,
      unlockCount: 0,
      reviewCount: 0,
      ratingAvg: 0,
      profile: { ...emptyProfile, fullName: userName },
      steps,
      districts: districtRows,
    };
  }

  const docs = await db
    .select()
    .from(documents)
    .where(eq(documents.specialistId, profileRow.id));

  for (const doc of docs) {
    if (!(doc.type in steps)) continue;
    steps[doc.type] = {
      status:
        doc.status === "approved"
          ? "approved"
          : doc.status === "rejected"
            ? "rejected"
            : "pending",
      fileName: doc.fileName,
      fileKey: doc.fileKey,
      reviewNote: doc.reviewNote,
    };
  }

  return {
    exists: true,
    status: profileRow.status,
    moderationNote: profileRow.moderationNote,
    slug: profileRow.slug,
    trustScore: profileRow.trustScore,
    unlockCount: profileRow.unlockCount,
    reviewCount: profileRow.reviewCount,
    ratingAvg: Number(profileRow.ratingAvg),
    profile: {
      fullName: profileRow.fullName === "Без имени" ? "" : profileRow.fullName,
      category: profileRow.category,
      birthDate: profileRow.birthDate ?? "",
      districtId: profileRow.districtId,
      experienceYears: profileRow.experienceYears,
      education: profileRow.education ?? "",
      languages: profileRow.languages ?? [],
      englishLevel: profileRow.englishLevel,
      priceAmount: profileRow.priceAmount,
      priceUnit: profileRow.priceUnit,
      description: profileRow.description ?? "",
      hasCar: profileRow.hasCar,
      liveIn: profileRow.liveIn,
      nightAvailable: profileRow.nightAvailable,
      newbornExp: profileRow.newbornExp,
    },
    steps,
    districts: districtRows,
  };
}
