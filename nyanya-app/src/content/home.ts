import type { StaticImageData } from "next/image";
import heroPhoto from "../../public/images/hero.jpg";
import nannyPhoto from "../../public/images/category-nanny.jpg";
import caregiverPhoto from "../../public/images/category-caregiver.jpg";
import driverPhoto from "../../public/images/category-driver.jpg";
import tutorPhoto from "../../public/images/category-tutor.jpg";
import interiorPhoto from "../../public/images/cta-interior.jpg";

/**
 * Главная страница — все строки в одном месте (RU — основная локаль).
 * Структура следует nyanya_project.md §1–§3; решения — по реестру fallback:
 * D1 self-serve · D2 логотипы-заглушки · D3 строка-заглушка · D4 две кнопки · D7 категорийная навигация.
 */

export type ContentImage = { src: StaticImageData; alt: string };

export const nav = {
  categories: [
    { label: "Няни", href: "/catalog?category=nanny" },
    { label: "Сиделки", href: "/catalog?category=caregiver" },
    { label: "Репетиторы", href: "/catalog?category=tutor" },
    { label: "Водители", href: "/catalog?category=driver" },
  ],
  about: { label: "О сервисе", href: "/about" },
  cta: { label: "Подобрать специалиста", href: "/catalog" },
  languages: [
    { code: "ru", label: "Русский", active: true },
    { code: "uz", label: "O‘zbekcha — скоро", active: false },
    { code: "en", label: "English — скоро", active: false },
  ],
} as const;

export const hero = {
  eyebrow: "Проверенные специалисты для вашей семьи",
  title: "Доверяйте главному",
  subtitle:
    "Мы тщательно проверяем специалистов, чтобы вы были спокойны за самое важное.",
  primary: { label: "Подобрать специалиста", href: "/catalog" },
  secondary: { label: "Как это работает", href: "/how-it-works" },
  image: {
    src: heroPhoto,
    alt: "Няня читает книгу вместе с девочкой на диване в светлой гостиной",
  } satisfies ContentImage,
  seal: ["Безопасность", "Доверие", "Забота"],
} as const;

// ⛳ D2: вымышленные wordmark-заглушки из референса — заменить до запуска
export const trustBar = {
  label: "Нам доверяют",
  brands: ["Velmora", "Aurevia", "Nordella", "Cavendish", "Lunaria"],
} as const;

export const services = {
  // D1 self-serve: заголовок-вариант из §3.4 (концьерж-фраза референса «Мы подбираем
  // для вас» противоречит самообслуживанию — шаги B4 переписаны под self-serve)
  title: "Кого вы ищете?",
  link: { label: "Смотреть все услуги", href: "/catalog" },
  cards: [
    {
      title: "Няни",
      description: "Заботливые и опытные няни для ваших детей",
      href: "/catalog?category=nanny",
      image: {
        src: nannyPhoto,
        alt: "Няня играет в деревянные кубики с маленькой девочкой",
      } satisfies ContentImage,
    },
    {
      title: "Сиделки",
      description: "Забота и поддержка для ваших близких",
      href: "/catalog?category=caregiver",
      image: {
        src: caregiverPhoto,
        alt: "Сиделка тепло улыбается пожилой женщине",
      } satisfies ContentImage,
    },
    {
      title: "Водители",
      description: "Надёжные водители для вашей семьи",
      href: "/catalog?category=driver",
      image: {
        src: driverPhoto,
        alt: "Водитель в костюме за рулём автомобиля",
      } satisfies ContentImage,
    },
    {
      title: "Репетиторы",
      description: "Опытные преподаватели для обучения и развития",
      href: "/catalog?category=tutor",
      image: {
        src: tutorPhoto,
        alt: "Репетитор помогает подростку с занятиями за столом",
      } satisfies ContentImage,
    },
  ],
} as const;

export const trustFeatures = {
  title: "Доверие, оформленное как роскошь",
  features: [
    {
      icon: "shield",
      title: "Проверка документов",
      description:
        "Паспорт, медицинские справки и сертификаты проверяются модератором до публикации анкеты.",
    },
    {
      icon: "gauge",
      title: "Индекс доверия",
      description:
        "Показатель доверия от 0 до 100 на основе верификации, опыта и обращений.",
    },
    {
      icon: "chat",
      title: "Прямой контакт",
      description:
        "После оплаты открываются телефон, Telegram и WhatsApp — общайтесь напрямую.",
    },
  ],
} as const;

export const howItWorks = {
  title: "Как это работает",
  steps: [
    {
      icon: "grid",
      title: "Выберите категорию",
      description: "Няня, сиделка, репетитор или водитель",
    },
    {
      icon: "search",
      title: "Изучите анкеты",
      // ⛳ короче §3.5 (без «видео-визиток») — функция видео скрыта до готовности (D13)
      description: "Фильтры, индекс доверия и отзывы",
    },
    {
      icon: "unlock",
      title: "Откройте контакты",
      // ⛳ формулировка референса; §3.5: «Оплатите доступ — телефон, Telegram и WhatsApp»
      description: "Разовая оплата — телефон, Telegram и WhatsApp",
    },
    {
      icon: "handshake",
      title: "Начните сотрудничество",
      description: "Договаривайтесь напрямую, без посредников",
    },
  ],
} as const;

export const ctaBand = {
  // ⛳ D3: цифра-заглушка — заменить на реальную до запуска.
  // Перенос строки — как в референсе; внутри «10 000» — неразрывные пробелы.
  title: "С нами более\n10 000 семей в Ташкенте",
  subtitle: "Присоединяйтесь к тем, кто уже доверил нам самое важное.",
  primary: { label: "Подобрать специалиста", href: "/catalog" },
  secondary: { label: "Стать специалистом", href: "/become-specialist" },
  image: { src: interiorPhoto, alt: "" } satisfies ContentImage,
} as const;

export const footer = {
  tagline: "Премиальный сервис по подбору специалистов для вашей семьи.",
  social: [
    { icon: "instagram", label: "Instagram", href: "https://instagram.com/nyanya.uz" },
    { icon: "telegram", label: "Telegram", href: "https://t.me/nyanya_uz" },
    { icon: "phone", label: "Позвонить", href: "tel:+998901234567" },
  ],
  columns: [
    {
      title: "Сервис",
      links: [
        { label: "Няни", href: "/catalog?category=nanny" },
        { label: "Сиделки", href: "/catalog?category=caregiver" },
        { label: "Репетиторы", href: "/catalog?category=tutor" },
        { label: "Водители", href: "/catalog?category=driver" },
      ],
    },
    {
      title: "О компании",
      links: [
        { label: "О сервисе", href: "/about" },
        { label: "Как это работает", href: "/how-it-works" },
        { label: "Проверка специалистов", href: "/verification" },
        { label: "Контакты", href: "/contacts" },
      ],
    },
    {
      title: "Полезное",
      links: [
        { label: "Блог", href: "/blog" },
        { label: "Вопросы и ответы", href: "/faq" },
        { label: "Для специалистов", href: "/become-specialist" },
      ],
    },
  ],
  // ⛳ контакты-заглушки (backlog T1–T2)
  phone: { label: "+998 90 123 45 67", href: "tel:+998901234567" },
  email: { label: "info@nyanya.uz", href: "mailto:info@nyanya.uz" },
  cta: { label: "Подобрать специалиста", href: "/catalog" },
  disclaimer:
    "Мы предоставляем платформу для поиска и взаимодействия. nyanya.uz не несёт ответственности за действия пользователей и не гарантирует качество услуг. Пользователь самостоятельно выбирает специалиста и принимает решение.",
  bottom: {
    copyright: "© 2026 nyanya.uz — Все права защищены",
    links: [
      { label: "Пользовательское соглашение", href: "/terms" },
      { label: "Политика конфиденциальности", href: "/privacy" },
    ],
    location: "Ташкент, Узбекистан",
  },
} as const;
