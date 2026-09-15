/**
 * Внешний адрес сайта без завершающего слэша — ссылки в письмах, robots.txt и
 * sitemap.xml. В проде NEXT_PUBLIC_APP_URL = https://www.nyanya.uz; запасное
 * значение то же, чтобы без переменной адреса не уводили на чужой хост.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL || "https://www.nyanya.uz"
).replace(/\/+$/, "");
