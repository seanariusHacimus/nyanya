/**
 * Клиент-безопасная часть домена «специалисты»: типы, справочник категорий
 * и форматирование. Серверные запросы к PostgreSQL — в lib/queries/specialists.
 */

/**
 * Единицы оплаты. Их три, и разбирать их двоичным «день или час» нельзя:
 * именно так анкета с месячной оплатой показывала семье «сум/час».
 */
export const PRICE_UNIT_LABEL = {
  hour: "час",
  day: "день",
  month: "месяц",
} as const;

export type PriceUnit = keyof typeof PRICE_UNIT_LABEL;
export type PriceUnitLabel = (typeof PRICE_UNIT_LABEL)[PriceUnit];

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

/**
 * Полнота профиля — то, что видит семья в каталоге и в анкете.
 *
 * Слова намеренно нейтральные. Прежние «Проверена» и «Премиум-проверен»
 * утверждали проверку там, где её не было: документы специалист предоставляет
 * по своему желанию, и у стандартного профиля их никто не видел. Теперь значок
 * говорит только о полноте того, что человек о себе предоставил, а обещание
 * проверки остаётся за премиумом, где она действительно была.
 *
 * У анкеты без принятой фотографии значка нет вовсе (2026-09-13): её
 * публикуют с аватаром по полу, и «Стандартный профиль» утверждал бы
 * фотографию, которой никто не видел. `UiSpecialist.verification` в этом
 * случае равен null.
 */
export const PROFILE_TIER = {
  published: {
    label: "Стандартный профиль",
    meaning:
      "Специалист заполнил анкету и добавил фотографию. Документы, удостоверяющие личность и здоровье, он не предоставлял.",
  },
  premium: {
    label: "Премиум-профиль",
    meaning:
      "Специалист предоставил полный пакет документов — личность, здоровье, отсутствие судимости, — и модератор их принял.",
  },
} as const;

export type ProfileTier = keyof typeof PROFILE_TIER;

/**
 * Что даёт «Премиум-профиль» — одни и те же слова на плашке в кабинете, на
 * странице документов и в письмах.
 *
 * Каждый пункт здесь обязан быть правдой в коде: первый обеспечивает
 * сортировка каталога (уровень идёт раньше оценки), второй — фильтр «только
 * премиум-профили», третий — значок с печатью на карточке. Обещать здесь то,
 * чего нет, значит повторить историю с «проверкой документов до публикации».
 */
export const PREMIUM_BENEFITS = [
  {
    title: "Выше в каталоге",
    text: "Премиум-анкеты идут первыми в общем списке — раньше сортировки по оценкам семей.",
  },
  {
    title: "Фильтр «только премиум»",
    text: "Семьи, которым важны проверенные документы, отбирают каталог одним переключателем.",
  },
  {
    title: "Отметка с печатью",
    text: "Значок «Премиум-профиль» — единственный на сайте, который говорит о проверке документов.",
  },
] as const;


/**
 * Пол специалиста. Нужен семье при выборе и аватарке-заглушке, когда
 * фотографии нет: безликий кружок с инициалами семье ничего не говорил.
 * null — анкета создана до появления поля и ещё не дозаполнена.
 */
export type Gender = "female" | "male";
export const GENDER_LABEL: Record<Gender, string> = {
  female: "Женщина",
  male: "Мужчина",
};
export const GENDER_OPTIONS = [
  { key: "female", label: "Женщина" },
  { key: "male", label: "Мужчина" },
] as const;

export type UiSpecialist = {
  slug: string;
  name: string;
  age: number | null;
  gender: Gender | null;
  category: CategoryKey;
  district: string;
  experienceYears: number;
  rating: number;
  reviewCount: number;
  priceFrom: number;
  priceUnit: PriceUnitLabel;
  /** Полнота профиля: см. PROFILE_TIER. null — принятой фотографии нет. */
  verification: ProfileTier | null;
  /**
   * false — специалист сам поставил «сейчас не ищу работу». Такие анкеты не
   * показываются в каталоге и в похожих, но остаются доступны по прямой
   * ссылке: у семьи она может быть сохранена, и глухая ошибка вместо страницы
   * была бы хуже честной строки «сейчас не принимает обращения».
   */
  available: boolean;
  languages: string[];
  english: "Нет" | "Базовый" | "Свободный";
  education: string;
  attributes: string[];
  /** свободный текст «что ещё предлагает» — пустая строка, если не заполнен */
  extraOffer: string;
  about: string[];
  photoUrl: string | null;
};

export type UiReview = {
  id: string;
  rating: number;
  /** Пустой, если человек поставил оценку и ничего не написал. */
  text: string;
  author: string;
};

/**
 * Русское склонение после числа: 1 год, 2 года, 5 лет, 21 год, 111 лет.
 *
 * Правило смотрит на две последние цифры, а не на одну: 11–14 всегда берут
 * форму «лет», хотя оканчиваются на 1, 2, 3 и 4. Без этого получалось
 * «11 год» и «13 года».
 */
export function pluralRu(
  n: number,
  one: string,
  few: string,
  many: string
): string {
  const mod10 = Math.abs(n) % 10;
  const mod100 = Math.abs(n) % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

/** «3 года», «5 лет», «1 год» — для опыта и возраста. */
export function yearsLabel(n: number): string {
  return `${n} ${pluralRu(n, "год", "года", "лет")}`;
}

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
