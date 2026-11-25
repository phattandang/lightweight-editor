/**
 * Applies migrations and the idempotent seed to the Postgres at DATABASE_URL (Neon).
 * Runs automatically during `pnpm build` on Vercel; skipped when DATABASE_URL is unset
 * (local dev uses embedded PGlite, which migrates + seeds itself on first use).
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import * as schema from "../src/db/schema";
import { seed } from "../src/db/seed";
import type { DB } from "../src/db";
import { databaseUrl } from "../src/db/url";

async function main() {
  const url = databaseUrl();
  if (!url) {
    console.log("[db-setup] DATABASE_URL not set - skipping (PGlite is used locally).");
    return;
  }
  const db = drizzle(neon(url), { schema });
  console.log("[db-setup] running migrations...");
  await migrate(db, { migrationsFolder: "drizzle" });
  console.log("[db-setup] seeding demo users...");
  await seed(db as DB);
  console.log("[db-setup] done.");
}

main().catch((err) => {
  console.error("[db-setup] failed:", err);
  process.exit(1);
});
