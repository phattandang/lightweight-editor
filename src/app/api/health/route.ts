import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { databaseUrl } from "@/db/url";

export const dynamic = "force-dynamic";

/** Deployment health: which DB driver is active, whether it is migrated/seeded, config present. No secrets. */
export async function GET() {
  const checks: Record<string, unknown> = {
    driver: databaseUrl() ? "neon" : process.env.VERCEL ? "unconfigured" : "pglite",
    sessionSecret: Boolean(process.env.SESSION_SECRET),
    database: "unknown",
    seeded: false,
  };
  try {
    const db = await getDb();
    const rows = await db.select({ id: users.id }).from(users).limit(1);
    checks.database = "ok";
    checks.seeded = rows.length > 0;
  } catch (err) {
    const e = err as { code?: string; name?: string; cause?: { code?: string; name?: string } };
    const code = e.cause?.code ?? e.code;
    checks.database = code === "42P01" ? "not_migrated" : "error";
    checks.errorCode = code ?? e.cause?.name ?? e.name ?? "unknown";
  }
  const ok = checks.database === "ok" && checks.seeded && checks.sessionSecret;
  return NextResponse.json({ ok, ...checks }, { status: ok ? 200 : 503 });
}
