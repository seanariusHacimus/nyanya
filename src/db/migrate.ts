import "dotenv/config";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

async function main() {
  const client = new PGlite(process.env.PGLITE_PATH ?? "./.pglite");
  const db = drizzle(client);
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("✓ migrations applied");
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
