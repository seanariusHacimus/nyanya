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
    { label: "Помощники по хозяйству", href: "/catalog?category=tutor" },
    { label: "Водители", href: "/catalog?category=driver" },
  ],
  /** Путь специалиста — первый уровень навигации */
  specialists: { label: "Специалистам", href: "/become-specialist" },
  /** «О сервисе» — выпадающее меню с остальными публичными страницами */
  aboutMenu: {
    label: "О сервисе",
    items: [
      { label: "О сервисе", href: "/about" },
      { label: "Как это работает", href: "/how-it-works" },
      { label: "Проверка специалистов", href: "/verification" },
      { label: "Вопросы и ответы", href: "/faq" },
      { label: "Блог", href: "/blog" },
      { label: "Контакты", href: "/contacts" },
    ],
  },
  login: { label: "Войти", href: "/login" },
  register: { label: "Регистрация", href: "/register" },
  languages: [
    { code: "ru", label: "Русский", active: true },
    { code: "uz", label: "O‘zbekcha — скоро", active: false },
    { code: "en", label: "English — скоро", active: false },
  ],
} as const;

export const hero = {
  /**
   * Позиционирование бренда — стоит над заголовком. Обещание про проверку
   * переехало в сам заголовок, поэтому здесь снова строка о том, что это за
   * сервис: повторять одну фразу дважды на одном экране незачем.
   */
  eyebrow: "nyanya.uz — премиальная платформа по поиску домашнего персонала",
  title: "Только проверенные анкеты специалистов",
  primary: { label: "Подобрать специалиста", href: "/catalog" },
  image: {
    src: heroPhoto,
    alt: "Няня читает книгу вместе с девочкой на диване в светлой гостиной",
  } satisfies ContentImage,
  seal: ["Безопасность", "Доверие", "Забота"],
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
      title: "Помощники по хозяйству",
      description: "Помощь по дому: уборка, готовка и бытовые дела",
      href: "/catalog?category=tutor",
      image: {
        src: tutorPhoto,
        alt: "Помощница по хозяйству расставляет свежие цветы в светлой гостиной",
      } satisfies ContentImage,
    },
  ],
} as const;

export const trustFeatures = {
  title: "Спокойствие начинается с доверия",
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
        "После бесплатной регистрации открываются телефон, Telegram и WhatsApp — общайтесь напрямую.",
    },
  ],
} as const;

export const howItWorks = {
  title: "Как это работает",
  steps: [
    {
      icon: "grid",
      title: "Выберите категорию",
      description: "Няня, сиделка, помощник по хозяйству или водитель",
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
      description: "Бесплатно после регистрации — телефон, Telegram и WhatsApp",
    },
    {
      icon: "handshake",
      title: "Начните сотрудничество",
      description: "Договаривайтесь напрямую, без посредников",
    },
  ],
} as const;

export const ctaBand = {
  // Никаких цифр о числе семей: их пока нет, а выдумывать социальное
  // доказательство нельзя. Перенос строки — как в макете.
  title: "Начните с проверенных\nспециалистов",
  subtitle:
    "Каждая анкета проходит проверку документов до публикации в каталоге.",
  primary: { label: "Подобрать специалиста", href: "/catalog" },
  secondary: { label: "Стать специалистом", href: "/become-specialist" },
  image: { src: interiorPhoto, alt: "" } satisfies ContentImage,
} as const;

/** Девиз бренда — единый источник для футера, метаданных и страниц. */
export const slogan = "Жизнь без забот";

export const footer = {
  slogan,
  tagline: "Премиальный сервис по подбору специалистов для вашей семьи.",
  social: [
    { icon: "instagram", label: "Instagram", href: "https://instagram.com/nyanya.uz" },
    { icon: "telegram", label: "Telegram", href: "https://t.me/nyanya_uz" },
  ],
  columns: [
    {
      title: "Сервис",
      links: [
        { label: "Няни", href: "/catalog?category=nanny" },
        { label: "Сиделки", href: "/catalog?category=caregiver" },
        { label: "Помощники по хозяйству", href: "/catalog?category=tutor" },
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
  // ⛳ почта-заглушка (backlog T2) — единственный публичный контакт компании
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
