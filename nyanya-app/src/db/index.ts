import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/*
 * Postgres via postgres-js — local dev uses the Docker Postgres (docker-compose),
 * production points DATABASE_URL at Railway. Same driver both places.
 */
const globalForDb = globalThis as unknown as {
  client?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.client ??
  postgres(process.env.DATABASE_URL!, { prepare: false, max: 10 });
if (process.env.NODE_ENV !== "production") globalForDb.client = client;

export const db = drizzle(client, { schema });
export { schema };
