import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

/** Runtime migrator (used locally and in Railway pre-deploy) — no drizzle-kit needed. */
async function main() {
  const client = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(client);
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("✓ migrations applied");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
