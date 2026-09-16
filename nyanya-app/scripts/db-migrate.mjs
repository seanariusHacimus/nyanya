/**
 * Применение drizzle-миграций. Запускается:
 *  - в Railway preDeploy при каждом деплое (DATABASE_URL — внутренний адрес);
 *  - локально через `railway run -s Postgres -- npm run db:migrate`
 *    (предпочитается DATABASE_PUBLIC_URL, т.к. *.railway.internal снаружи недоступен).
 * Идемпотентен: уже применённые миграции пропускаются по журналу.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const onRailwayDeploy = Boolean(process.env.RAILWAY_DEPLOYMENT_ID);
const url = onRailwayDeploy
  ? process.env.DATABASE_URL
  : process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;

if (!url) {
  console.error("db-migrate: DATABASE_URL is not set");
  process.exit(1);
}

// onnotice: гасим NOTICE от идемпотентного бутстрапа журнала (IF NOT EXISTS)
const client = postgres(url, { max: 1, connect_timeout: 20, onnotice: () => {} });
try {
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  console.log("db-migrate: schema is up to date");
} finally {
  await client.end();
}
