import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { mkdirSync } from "node:fs";
import path from "node:path";
import * as schema from "./schema";
import type { DB } from "./index";
import { seed } from "./seed";

/**
 * Creates an embedded Postgres (PGlite). Pass "memory://" for tests.
 * Runs migrations and the idempotent seed so the app is usable immediately.
 */
export async function createPgliteDb(dataDir: string, opts: { seed?: boolean } = {}): Promise<DB> {
  if (!dataDir.startsWith("memory://")) mkdirSync(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  // The query-builder API is identical across drivers; cast to the shared type.
  const typed = db as unknown as DB;
  if (opts.seed ?? true) await seed(typed);
  return typed;
}
