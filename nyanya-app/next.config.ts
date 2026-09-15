import path from "node:path";
import type { NextConfig } from "next";

/**
 * Защитные заголовки на всех ответах приложения (аудит 2026-09-14: на проде не
 * было ни одного). Задаются только здесь: заголовок из headers() ставится на
 * ответ раньше, чем отработает route-хендлер, а Next добавляет заголовок из
 * Response хендлера лишь тогда, когда такого ключа на ответе ещё нет
 * (server/send-response.js). Значит, хендлер эти значения переопределить не
 * может — политика для отдельного маршрута тоже должна жить в headers().
 *
 * Не получают их только редиректы, которые Next отдаёт по своему конфигу:
 * 307 со старых адресов локали (redirects() ниже) и 308, срезающий слэш в
 * конце адреса (/catalog/ → /catalog). Заголовков из headers() у них нет,
 * тела тоже.
 *
 * СОСТОЯНИЕ (2026-09-15): CSP в режиме отчёта — ничего не блокирует, только
 * присылает нарушения в /api/csp-report, откуда они попадают в лог строкой
 * «[csp] …». HSTS на год, без includeSubDomains и preload (решение владельца:
 * апекс nyanya.uz у части резолверов ещё ведёт на старый хост, обязательство
 * за все поддомены сейчас давать нельзя). Следующий шаг — после недели чистых
 * логов переименовать ключ Content-Security-Policy-Report-Only в
 * Content-Security-Policy и обновить эту отметку и CLAUDE.md.
 */
const isDev = process.env.NODE_ENV === "development";

/** Куда браузеры шлют отчёты о нарушениях CSP. Маршрут: src/app/api/csp-report. */
const CSP_REPORT_PATH = "/api/csp-report";
/** Имя группы для report-to; адрес группы задаёт заголовок Reporting-Endpoints. */
const CSP_REPORT_GROUP = "csp-endpoint";

/**
 * Политика перечисляет то, что сайт действительно загружает (проверено по HTML
 * сборки): всё со своего домена, внешних скриптов, стилей, шрифтов и картинок
 * нет. Новый внешний источник — аналитика, чат-виджет, CDN картинок — сначала
 * добавляется сюда, иначе после перевода CSP в боевой режим он будет заблокирован.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  // 'unsafe-inline': Next вставляет данные для гидратации inline-скриптами
  // (self.__next_f.push). Убрать его можно только nonce-политикой, а она
  // делает статические страницы динамическими — это решение не принято.
  // 'unsafe-eval' нужен только `next dev`: React восстанавливает стеки через eval.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  // атрибуты style="…" у next/image и motion
  "style-src 'self' 'unsafe-inline'",
  // data: — размытые заглушки next/image (placeholder="blur": data:image/svg+xml
  // с вложенным data:image/jpeg); blob: — запас под превью выбранного файла
  // (сейчас таких превью нет)
  "img-src 'self' data: blob:",
  // next/font раздаёт Playfair и Golos со своего домена (/_next/static/media)
  "font-src 'self'",
  // Better Auth без baseURL, /api/*, серверные действия, RSC — тот же origin
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // Сайт никогда не встраивается во фрейм. В режиме отчёта frame-ancestors не
  // блокирует — сейчас это делает X-Frame-Options: DENY.
  "frame-ancestors 'none'",
  // report-uri — старый механизм для браузеров без Reporting API (Firefox);
  // Chrome и Edge при наличии report-to шлют отчёты туда (и только по HTTPS —
  // на http://localhost не придёт ничего), а report-uri игнорируют. Форматы тел
  // разные, приёмник понимает оба.
  `report-uri ${CSP_REPORT_PATH}`,
  `report-to ${CSP_REPORT_GROUP}`,
].join("; ");

const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // clipboard-write не запрещать: кнопка «Поделиться» копирует ссылку
  // (components/share-button.tsx)
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  {
    key: "Reporting-Endpoints",
    value: `${CSP_REPORT_GROUP}="${CSP_REPORT_PATH}"`,
  },
  { key: "Content-Security-Policy-Report-Only", value: CONTENT_SECURITY_POLICY },
];

const nextConfig: NextConfig = {
  // Не сообщаем «X-Powered-By: Next.js» в каждом ответе.
  poweredByHeader: false,

  // Репозиторий содержит второе приложение в корне (старый билд на main) со своим
  // lockfile — фиксируем корень проекта, чтобы Turbopack не подхватывал его файлы.
  turbopack: {
    root: path.join(__dirname),
  },

  /**
   * Документы верификации загружаются серверным действием, а Next режет тело
   * такого запроса на 1 МБ по умолчанию — причём ДО того, как действие
   * запустится. Приложение при этом разрешает файлы до 10 МБ
   * (`MAX_FILE_BYTES`), и своя проверка размера живёт внутри действия, куда
   * управление уже не доходило: любая фотография с телефона (2–6 МБ) падала
   * с «Body exceeded 1 MB limit», а специалист видел страницу «Что-то пошло
   * не так» вместо внятного объяснения.
   *
   * Лимит поднят выше MAX_FILE_BYTES с запасом: документация Next
   * предупреждает, что считается сырое тело запроса, включая накладные
   * расходы multipart (границы, заголовки частей) — это ещё 10–20 КБ.
   * Так слишком большой файл отсекает наша проверка с человеческим текстом,
   * а не платформа с аварийной страницей.
   */
  experimental: {
    serverActions: {
      bodySizeLimit: "11mb",
    },
    /**
     * Под proxy (src/proxy.ts, маршруты /specialist/*, /account/*, /admin/*)
     * Next клонирует тело запроса в память и молча обрезает всё сверх этого
     * лимита, по умолчанию 10 МБ. Мастер анкеты разрешает файл ровно 10 МБ
     * плюс накладные multipart — такой файл доходил до действия обрезанным.
     * Выравниваем с bodySizeLimit.
     */
    proxyClientMaxBodySize: "11mb",
  },

  /**
   * Оптимизатор /_next/image принимает только свои картинки: файлы из
   * public/images и фотографии анкет через /api/documents. Любой другой путь
   * на этом же домене отвечает 400 — чужой файл оптимизатору не подсунуть
   * (Next 16.2 держал здесь уязвимость удалённого выполнения кода через AVIF,
   * а без списка оптимизатор принимал любой локальный адрес; аудит 2026-09-14).
   * search: "" обязателен — без него разрешается любая строка запроса.
   * Статические импорты (/_next/static/media/**) Next добавляет сам.
   * SVG остаётся выключенным: dangerouslyAllowSVG по умолчанию false.
   */
  images: {
    localPatterns: [
      { pathname: "/images/**", search: "" },
      { pathname: "/api/documents/**", search: "" },
    ],
  },

  /**
   * "/:path*" покрывает и корень, и страницы, и API, и /_next/static (Cache-Control
   * immutable у хэшированных файлов Next ставит сам и переопределить не даёт).
   */
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },

  /**
   * Старое приложение жило на префиксах локали: /ru/catalog, /uz/…, /en/….
   * В текущей сборке локальных маршрутов нет — интерфейс только русский,
   * адреса без префикса. Старые ссылки отдавали 404, поэтому уводим их на
   * соответствующие страницы.
   *
   * Редирект намеренно временный (307, не 308): когда появится настоящая
   * локализация, /ru/* станет рабочим адресом, а постоянный редирект к тому
   * моменту уже осел бы в кэше браузеров. Тогда этот блок нужно удалить.
   */
  async redirects() {
    return [
      { source: "/:locale(ru|uz|en)", destination: "/", permanent: false },
      {
        source: "/:locale(ru|uz|en)/:path*",
        destination: "/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
