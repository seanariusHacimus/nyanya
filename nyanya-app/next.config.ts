import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Репозиторий содержит второе приложение в корне (старый билд на main) со своим
  // lockfile — фиксируем корень проекта, чтобы Turbopack не подхватывал его файлы.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
