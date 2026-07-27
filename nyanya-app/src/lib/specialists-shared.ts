/**
 * Клиент-безопасная часть домена «специалисты»: типы, справочник категорий
 * и форматирование. Серверные запросы к PostgreSQL — в lib/queries/specialists.
 */

export type CategoryKey = "nanny" | "caregiver" | "tutor" | "driver";

export const categories: Record<
  CategoryKey,
  { label: string; plural: string; unit: "час" | "день"; catalogH1: string }
> = {
  nanny: { label: "Няня", plural: "Няни", unit: "час", catalogH1: "Няни в Ташкенте" },
  caregiver: { label: "Сиделка", plural: "Сиделки", unit: "день", catalogH1: "Сиделки в Ташкенте" },
  tutor: { label: "Репетитор", plural: "Репетиторы", unit: "час", catalogH1: "Репетиторы в Ташкенте" },
  driver: { label: "Водитель", plural: "Водители", unit: "час", catalogH1: "Водители в Ташкенте" },
};

export type UiSpecialist = {
  slug: string;
  name: string;
  age: number | null;
  category: CategoryKey;
  district: string;
  experienceYears: number;
  rating: number;
  reviewCount: number;
  priceFrom: number;
  priceUnit: "час" | "день";
  trustScore: number;
  verification: "premium" | "verified";
  languages: string[];
  english: "Нет" | "Базовый" | "Свободный";
  education: string;
  attributes: string[];
  about: string[];
  photoUrl: string | null;
};

export type UiReview = { rating: number; text: string; author: string };

export function formatPrice(
  s: Pick<UiSpecialist, "priceFrom" | "priceUnit">
): string {
  return `от ${s.priceFrom.toLocaleString("ru-RU")} сум/${s.priceUnit}`;
}
