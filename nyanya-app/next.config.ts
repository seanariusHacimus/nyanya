import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Репозиторий содержит второе приложение в корне (старый билд на main) со своим
  // lockfile — фиксируем корень проекта, чтобы Turbopack не подхватывал его файлы.
  turbopack: {
    root: path.join(__dirname),
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
