import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

/**
 * One query API, two drivers:
 *  - DATABASE_URL set  -> Neon serverless Postgres over HTTP (production / Vercel)
 *  - DATABASE_URL unset -> embedded PGlite (real Postgres compiled to WASM) persisted
 *    in ./.data so `pnpm dev` works with zero database setup.
 */
export type DB = NeonHttpDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __db?: Promise<DB> };

async function createDb(): Promise<DB> {
  const url = process.env.DATABASE_URL;
  if (url) {
    return drizzleNeon(neon(url), { schema });
  }
  if (process.env.VERCEL) {
    throw new Error("DATABASE_URL is not configured for this Vercel deployment.");
  }
  const { createPgliteDb } = await import("./pglite");
  return createPgliteDb(process.env.PGLITE_DIR ?? "./.data/pglite");
}

export function getDb(): Promise<DB> {
  if (!globalForDb.__db) {
    globalForDb.__db = createDb().catch((err) => {
      globalForDb.__db = undefined;
      throw err;
    });
  }
  return globalForDb.__db;
}

export { schema };
