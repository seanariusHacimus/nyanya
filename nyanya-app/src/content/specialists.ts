
/**
 * Справочники каталога: категории и районы Ташкента.
 *
 * Демонстрационные анкеты жили здесь до 2026-08-08 и удалены вместе с
 * выдуманными аккаунтами: каталог наполняется только настоящими анкетами
 * из базы (`lib/queries/specialists.ts`).
 */

export type CategoryKey = "nanny" | "caregiver" | "tutor" | "driver";

export const categories: Record<
  CategoryKey,
  { label: string; plural: string; unit: "час" | "день"; catalogH1: string }
> = {
  nanny: { label: "Няня", plural: "Няни", unit: "час", catalogH1: "Няни в Ташкенте" },
  caregiver: {
    label: "Сиделка",
    plural: "Сиделки",
    unit: "день",
    catalogH1: "Сиделки в Ташкенте",
  },
  tutor: {
    label: "Помощник по хозяйству",
    plural: "Помощники по хозяйству",
    unit: "час",
    catalogH1: "Помощники по хозяйству в Ташкенте",
  },
  driver: {
    label: "Водитель",
    plural: "Водители",
    unit: "час",
    catalogH1: "Водители в Ташкенте",
  },
};

export const districts = [
  "Алмазарский",
  "Бектемирский",
  "Мирабадский",
  "Мирзо-Улугбекский",
  "Сергелийский",
  "Учтепинский",
  "Чиланзарский",
  "Шайхантахурский",
  "Юнусабадский",
  "Яккасарайский",
  "Янгихаётский",
  "Яшнабадский",
] as const;

export type District = (typeof districts)[number];
