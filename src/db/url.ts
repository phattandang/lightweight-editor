/** Postgres URL: our DATABASE_URL, or POSTGRES_URL as created by Vercel's Neon integration. */
export function databaseUrl(): string | undefined {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || undefined;
}
