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
  tutor: { label: "Помощник по хозяйству", plural: "Помощники по хозяйству", unit: "час", catalogH1: "Помощники по хозяйству в Ташкенте" },
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
  /**
   * Что сайт обещает семье:
   *   published — анкету проверил модератор, документы не проверялись;
   *   premium   — документы проверены администратором.
   * Третьего не бывает: неопубликованных анкет в каталоге нет.
   */
  verification: "premium" | "published";
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

export type SpecialistContacts = {
  phone: string;
  phoneHref: string;
};

/**
 * Контакты специалиста — только телефон.
 *
 * Telegram и WhatsApp отсюда убраны: они строились из slug анкеты
 * («Севара Тошпулатова» → t.me/sevara_toshpulatova) и с настоящим аккаунтом
 * совпали бы разве что случайно. Семья, открывшая контакты, писала бы
 * постороннему человеку и думала, что пишет специалисту.
 *
 * Вернутся, когда специалисты начнут указывать их сами в анкете.
 */
export function buildContacts(phone: string): SpecialistContacts {
  const digits = phone.replace(/[^\d]/g, "");
  return {
    phone,
    phoneHref: `tel:+${digits}`,
  };
}
