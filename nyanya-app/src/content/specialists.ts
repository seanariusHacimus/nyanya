import type { StaticImageData } from "next/image";
import sevara from "../../public/images/specialists/sevara-toshpulatova.jpg";
import nilufar from "../../public/images/specialists/nilufar-karimova.jpg";
import ekaterina from "../../public/images/specialists/ekaterina-sokolova.jpg";
import dilnoza from "../../public/images/specialists/dilnoza-yusupova.jpg";
import gulnora from "../../public/images/specialists/gulnora-azimova.jpg";
import tatyana from "../../public/images/specialists/tatyana-morozova.jpg";
import kamila from "../../public/images/specialists/kamila-rakhimova.jpg";
import aziz from "../../public/images/specialists/aziz-tursunov.jpg";
import madina from "../../public/images/specialists/madina-ismailova.jpg";
import bakhtiyor from "../../public/images/specialists/bakhtiyor-nasyrov.jpg";
import shukhrat from "../../public/images/specialists/shukhrat-alimov.jpg";
import dmitriy from "../../public/images/specialists/dmitriy-kovalev.jpg";

/**
 * ⛳ Демо-данные каталога (12 анкет) — заменяются реальным API при подключении бэкенда.
 * Структура полей — по §4.5 (карточка) и §5 (профиль) nyanya_project.md.
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
    label: "Репетитор",
    plural: "Репетиторы",
    unit: "час",
    catalogH1: "Репетиторы в Ташкенте",
  },
  driver: {
    label: "Водитель",
    plural: "Водители",
    unit: "час",
    catalogH1: "Водители в Ташкенте",
  },
};

export const districts = [
  "Юнусабадский",
  "Мирзо-Улугбекский",
  "Чиланзарский",
  "Яккасарайский",
  "Мирабадский",
  "Шайхантахурский",
] as const;

export type District = (typeof districts)[number];

export type Review = { rating: number; text: string; author: string };

export type Specialist = {
  slug: string;
  name: string;
  age: number;
  category: CategoryKey;
  district: District;
  experienceYears: number;
  rating: number;
  priceFrom: number;
  trustScore: number;
  verification: "premium" | "verified";
  languages: string[];
  english: "Нет" | "Базовый" | "Свободный";
  education: string;
  attributes: string[];
  about: string[];
  photo: StaticImageData;
  photoAlt: string;
  reviews: Review[];
};

export const specialists: Specialist[] = [
  {
    slug: "sevara-toshpulatova",
    name: "Севара Тошпулатова",
    age: 31,
    category: "nanny",
    district: "Юнусабадский",
    experienceYears: 11,
    rating: 4.8,
    priceFrom: 45000,
    trustScore: 84,
    verification: "premium",
    languages: ["Русский", "Узбекский"],
    english: "Базовый",
    education: "Педагогический колледж",
    attributes: ["Свой автомобиль", "С проживанием", "Опыт с новорождёнными"],
    about: [
      "Работаю няней одиннадцать лет — от новорождённых до младших школьников. Для меня важно, чтобы ребёнку было спокойно и интересно: режим, прогулки, развивающие игры и много чтения вслух.",
      "Последние четыре года сопровождала двух детей в одной семье от рождения до сада. Могу помочь с адаптацией к саду и мягким укладыванием.",
    ],
    photo: sevara,
    photoAlt: "Севара Тошпулатова — няня, портрет",
    reviews: [
      {
        rating: 5,
        text: "Севара работала с нашей дочкой два года. Внимательная, пунктуальная, дочка её обожала. Рекомендуем всей семьёй.",
        author: "Sherzod K.",
      },
      {
        rating: 5,
        text: "Очень спокойный и надёжный человек. Всегда подробно рассказывала, как прошёл день.",
        author: "Наталья В.",
      },
      {
        rating: 4,
        text: "Профессиональная няня, ребёнок быстро привык. Единственное — хотелось бы больше гибкости по графику.",
        author: "Диёра А.",
      },
      {
        rating: 5,
        text: "Помогла наладить режим сна младенца за две недели. Золотой человек.",
        author: "Тимур М.",
      },
      {
        rating: 5,
        text: "Доверяем ей самое дорогое уже второй год. Ни разу не пожалели.",
        author: "Камола И.",
      },
    ],
  },
  {
    slug: "nilufar-karimova",
    name: "Нилюфар Каримова",
    age: 42,
    category: "nanny",
    district: "Мирзо-Улугбекский",
    experienceYears: 17,
    rating: 4.9,
    priceFrom: 50000,
    trustScore: 91,
    verification: "premium",
    languages: ["Узбекский", "Русский"],
    english: "Нет",
    education: "ТашГПУ им. Низами, дошкольная педагогика",
    attributes: ["С проживанием", "Ночные смены", "Опыт с новорождёнными"],
    about: [
      "Семнадцать лет опыта, из них девять — с двойняшками и погодками. Умею выстраивать день так, чтобы мама могла спокойно работать или отдыхать.",
      "Готовлю детское меню, знаю основы первой помощи, регулярно прохожу медосмотры.",
    ],
    photo: nilufar,
    photoAlt: "Нилюфар Каримова — няня, портрет",
    reviews: [
      {
        rating: 5,
        text: "Нилюфар-опа — няня от Бога. С двумя нашими малышами справляется лучше, чем мы вдвоём.",
        author: "Азиза Р.",
      },
      {
        rating: 5,
        text: "Работает у нас с проживанием почти год. Дом в порядке, дети счастливы.",
        author: "Bobur S.",
      },
      {
        rating: 5,
        text: "Опыт чувствуется во всём. Спасибо за терпение и доброту!",
        author: "Мадина Х.",
      },
    ],
  },
  {
    slug: "ekaterina-sokolova",
    name: "Екатерина Соколова",
    age: 38,
    category: "nanny",
    district: "Яккасарайский",
    experienceYears: 12,
    rating: 4.7,
    priceFrom: 55000,
    trustScore: 79,
    verification: "verified",
    languages: ["Русский"],
    english: "Свободный",
    education: "РГПУ им. Герцена, дошкольное образование",
    attributes: ["Для новорождённых", "Ночные смены"],
    about: [
      "Дипломированный педагог раннего развития. Занимаюсь с детьми по методикам Монтессори и мягкой сенсорной интеграции.",
      "Свободный английский — играем и читаем на двух языках. Подготовлю ребёнка к международному саду или школе.",
    ],
    photo: ekaterina,
    photoAlt: "Екатерина Соколова — няня, портрет",
    reviews: [
      {
        rating: 5,
        text: "Сын за полгода заговорил по-английски в быту. Катя — потрясающий педагог.",
        author: "Лола Т.",
      },
      {
        rating: 4,
        text: "Очень грамотный подход к развитию. Стоимость выше средней, но оправдана.",
        author: "Jasur A.",
      },
      {
        rating: 5,
        text: "Надёжная и образованная няня, всегда на связи.",
        author: "Ирина П.",
      },
    ],
  },
  {
    slug: "dilnoza-yusupova",
    name: "Дилноза Юсупова",
    age: 27,
    category: "nanny",
    district: "Чиланзарский",
    experienceYears: 5,
    rating: 4.6,
    priceFrom: 35000,
    trustScore: 72,
    verification: "verified",
    languages: ["Узбекский", "Русский"],
    english: "Базовый",
    education: "Ташкентский педагогический колледж",
    attributes: ["Ночная няня"],
    about: [
      "Энергичная няня для активных малышей: прогулки, игры, творчество. Легко нахожу общий язык с детьми от года до семи.",
      "Могу выходить в ночные смены и подменять в выходные.",
    ],
    photo: dilnoza,
    photoAlt: "Дилноза Юсупова — няня, портрет",
    reviews: [
      {
        rating: 5,
        text: "Дилноза — солнечный человек, дети к ней тянутся. Очень выручает с ночными сменами.",
        author: "Нигора С.",
      },
      {
        rating: 4,
        text: "Ответственная и добрая. Опыта пока меньше, чем у старших коллег, но старания на десять из десяти.",
        author: "Олег Д.",
      },
    ],
  },
  {
    slug: "gulnora-azimova",
    name: "Гульнора Азимова",
    age: 48,
    category: "caregiver",
    district: "Мирабадский",
    experienceYears: 15,
    rating: 4.9,
    priceFrom: 380000,
    trustScore: 88,
    verification: "premium",
    languages: ["Узбекский", "Русский"],
    english: "Нет",
    education: "Ташкентский медицинский колледж, сестринское дело",
    attributes: ["С проживанием", "Ночные смены"],
    about: [
      "Медицинская сестра по образованию, пятнадцать лет ухаживаю за пожилыми людьми: гигиена, приём лекарств по расписанию, измерение давления и сахара, сопровождение к врачам.",
      "Работала с лежачими пациентами и людьми с деменцией. Отношусь к подопечным как к родным.",
    ],
    photo: gulnora,
    photoAlt: "Гульнора Азимова — сиделка, портрет",
    reviews: [
      {
        rating: 5,
        text: "Гульнора-опа ухаживала за моей мамой полтора года. Профессионализм и человечность — редкое сочетание.",
        author: "Дилшод Н.",
      },
      {
        rating: 5,
        text: "Медицинское образование чувствуется: всё по расписанию, все назначения врача соблюдаются идеально.",
        author: "Светлана К.",
      },
      {
        rating: 5,
        text: "Бабушка называет её дочкой. Это говорит всё.",
        author: "Умид Р.",
      },
    ],
  },
  {
    slug: "tatyana-morozova",
    name: "Татьяна Морозова",
    age: 52,
    category: "caregiver",
    district: "Юнусабадский",
    experienceYears: 20,
    rating: 4.8,
    priceFrom: 350000,
    trustScore: 86,
    verification: "premium",
    languages: ["Русский"],
    english: "Базовый",
    education: "Медицинское училище, сестринское дело",
    attributes: ["Ночные смены"],
    about: [
      "Двадцать лет в уходе за пожилыми и людьми после операций. Умею обращаться с ходунками, противопролежневыми системами, знаю особенности восстановительного периода.",
      "Спокойная, аккуратная, без вредных привычек. Могу дежурить ночами.",
    ],
    photo: tatyana,
    photoAlt: "Татьяна Морозова — сиделка, портрет",
    reviews: [
      {
        rating: 5,
        text: "Татьяна Ивановна помогала папе восстановиться после инсульта. Терпение и профессионализм на высоте.",
        author: "Марина Л.",
      },
      {
        rating: 5,
        text: "Очень организованная и внимательная. Всегда чистота и порядок.",
        author: "Рустам Г.",
      },
      {
        rating: 4,
        text: "Опытная сиделка, рекомендую. Единственный минус — плотный график, сложно менять дни.",
        author: "Анвар Т.",
      },
    ],
  },
  {
    slug: "kamila-rakhimova",
    name: "Камила Рахимова",
    age: 29,
    category: "tutor",
    district: "Мирзо-Улугбекский",
    experienceYears: 7,
    rating: 4.9,
    priceFrom: 70000,
    trustScore: 87,
    verification: "premium",
    languages: ["Русский", "Узбекский", "Английский"],
    english: "Свободный",
    education: "УзГУМЯ, преподавание английского языка",
    attributes: [],
    about: [
      "Преподаю английский детям и подросткам: от первых слов до IELTS. Средний результат моих учеников — IELTS 7.0.",
      "Урок строю на разговорной практике и играх, домашние задания — без зубрёжки. Занимаюсь у вас дома или онлайн.",
    ],
    photo: kamila,
    photoAlt: "Камила Рахимова — репетитор английского, портрет",
    reviews: [
      {
        rating: 5,
        text: "Дочь сдала IELTS на 7.5 после года занятий с Камилой. Лучший репетитор, что у нас был.",
        author: "Фарход Ю.",
      },
      {
        rating: 5,
        text: "Сын полюбил английский — раньше это казалось невозможным.",
        author: "Екатерина Б.",
      },
      {
        rating: 5,
        text: "Пунктуальная, современная, результат виден с первого месяца.",
        author: "Малика З.",
      },
    ],
  },
  {
    slug: "aziz-tursunov",
    name: "Азиз Турсунов",
    age: 35,
    category: "tutor",
    district: "Шайхантахурский",
    experienceYears: 10,
    rating: 4.8,
    priceFrom: 60000,
    trustScore: 82,
    verification: "verified",
    languages: ["Узбекский", "Русский"],
    english: "Базовый",
    education: "НУУз, механико-математический факультет",
    attributes: [],
    about: [
      "Готовлю школьников к экзаменам по математике и физике: национальные тесты, олимпиады, поступление в вузы.",
      "Объясняю сложное простыми словами — ученики перестают бояться предмета и начинают решать сами.",
    ],
    photo: aziz,
    photoAlt: "Азиз Турсунов — репетитор математики, портрет",
    reviews: [
      {
        rating: 5,
        text: "Сын поступил на бюджет в ТУИТ. Азиз-ака объясняет так, что понимает даже гуманитарий.",
        author: "Гульчехра М.",
      },
      {
        rating: 5,
        text: "Строгий, но справедливый. Оценки по математике выросли с 3 до 5.",
        author: "Виктор С.",
      },
      {
        rating: 4,
        text: "Отличный предметник. Иногда занятия сдвигаются из-за загруженности.",
        author: "Зарина К.",
      },
    ],
  },
  {
    slug: "madina-ismailova",
    name: "Мадина Исмаилова",
    age: 33,
    category: "tutor",
    district: "Яккасарайский",
    experienceYears: 9,
    rating: 4.7,
    priceFrom: 55000,
    trustScore: 78,
    verification: "verified",
    languages: ["Русский", "Узбекский"],
    english: "Базовый",
    education: "ТашГПУ им. Низами, начальное образование",
    attributes: [],
    about: [
      "Учитель начальных классов: чтение, письмо, математика, подготовка к школе. Помогаю первоклассникам мягко войти в учёбу.",
      "Работаю с детьми с разным темпом — подбираю подход, а не подгоняю под шаблон.",
    ],
    photo: madina,
    photoAlt: "Мадина Исмаилова — репетитор начальных классов, портрет",
    reviews: [
      {
        rating: 5,
        text: "Дочка научилась читать за три месяца и полюбила книги. Спасибо, Мадина!",
        author: "Севиль А.",
      },
      {
        rating: 4,
        text: "Хороший педагог для малышей, очень терпеливая.",
        author: "Денис Ф.",
      },
    ],
  },
  {
    slug: "bakhtiyor-nasyrov",
    name: "Бахтиёр Насыров",
    age: 41,
    category: "driver",
    district: "Юнусабадский",
    experienceYears: 18,
    rating: 4.9,
    priceFrom: 35000,
    trustScore: 89,
    verification: "premium",
    languages: ["Узбекский", "Русский"],
    english: "Базовый",
    education: "Категории B, C · безаварийный стаж 18 лет",
    attributes: ["Свой автомобиль"],
    about: [
      "Восемнадцать лет за рулём без единой аварии. Вожу детей в школу и на секции, сопровождаю семьи в поездках по городу и области.",
      "Собственный минивэн с детскими креслами, всегда чистый салон. Не курю.",
    ],
    photo: bakhtiyor,
    photoAlt: "Бахтиёр Насыров — семейный водитель, портрет",
    reviews: [
      {
        rating: 5,
        text: "Бахтиёр возит наших детей в школу второй год. Пунктуален до минуты, дети его обожают.",
        author: "Алишер Х.",
      },
      {
        rating: 5,
        text: "Аккуратный стиль вождения, всегда поможет с сумками. Настоящий семейный водитель.",
        author: "Юлия Н.",
      },
      {
        rating: 5,
        text: "Надёжен как швейцарские часы.",
        author: "Санжар Б.",
      },
    ],
  },
  {
    slug: "shukhrat-alimov",
    name: "Шухрат Алимов",
    age: 38,
    category: "driver",
    district: "Чиланзарский",
    experienceYears: 14,
    rating: 4.7,
    priceFrom: 30000,
    trustScore: 80,
    verification: "verified",
    languages: ["Узбекский", "Русский"],
    english: "Нет",
    education: "Категории B · стаж 14 лет",
    attributes: ["Свой автомобиль"],
    about: [
      "Семейный водитель: школа, секции, поликлиника, аэропорт. Знаю город без навигатора, всегда есть запасной маршрут.",
      "Седан бизнес-класса, детское кресло по запросу.",
    ],
    photo: shukhrat,
    photoAlt: "Шухрат Алимов — семейный водитель, портрет",
    reviews: [
      {
        rating: 5,
        text: "Возит жену и сына уже полгода. Спокойный, вежливый, машина всегда чистая.",
        author: "Отабек И.",
      },
      {
        rating: 4,
        text: "Хороший водитель, изредка бывают накладки по времени в час пик.",
        author: "Мария В.",
      },
    ],
  },
  {
    slug: "dmitriy-kovalev",
    name: "Дмитрий Ковалёв",
    age: 45,
    category: "driver",
    district: "Мирабадский",
    experienceYears: 22,
    rating: 4.8,
    priceFrom: 40000,
    trustScore: 85,
    verification: "premium",
    languages: ["Русский"],
    english: "Базовый",
    education: "Категории B, D · курсы контраварийного вождения",
    attributes: ["Свой автомобиль"],
    about: [
      "Профессиональный водитель с двадцатидвухлетним стажем, включая работу в дипломатических миссиях. Прошёл курсы контраварийной подготовки.",
      "Конфиденциальность, пунктуальность, деловой стиль. Комфортный кроссовер бизнес-класса.",
    ],
    photo: dmitriy,
    photoAlt: "Дмитрий Ковалёв — персональный водитель, портрет",
    reviews: [
      {
        rating: 5,
        text: "Дмитрий — водитель экстра-класса. Доверяем ему перевозку детей без сопровождения.",
        author: "Георгий А.",
      },
      {
        rating: 5,
        text: "Безупречная пунктуальность и такт. Рекомендую для деловых семей.",
        author: "Нодира Ш.",
      },
      {
        rating: 4,
        text: "Очень профессионален, стоимость соответствует уровню.",
        author: "Павел Е.",
      },
    ],
  },
];

export const UNLOCK_FEE_UZS = 29000;

export function getSpecialist(slug: string): Specialist | undefined {
  return specialists.find((s) => s.slug === slug);
}

export function similarSpecialists(to: Specialist, count = 3): Specialist[] {
  return specialists
    .filter((s) => s.slug !== to.slug && s.category === to.category)
    .concat(specialists.filter((s) => s.slug !== to.slug && s.category !== to.category))
    .slice(0, count);
}

export function formatPrice(s: Specialist): string {
  // toLocaleString("ru-RU") разделяет разряды неразрывным пробелом
  return `от ${s.priceFrom.toLocaleString("ru-RU")} сум/${categories[s.category].unit}`;
}
