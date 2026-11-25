import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { getDb, type DB } from "@/db";
import { readSessionToken, SESSION_COOKIE, type SessionUser } from "./auth";
import { AppError, unauthorized } from "./errors";

/**
 * The "API gateway" from the design: every API route goes through here for
 * authentication, DB access and uniform error -> HTTP mapping.
 */
type Ctx<P> = { params: Promise<P> };
type Handler<P> = (
  req: NextRequest,
  ctx: { params: P; db: DB; user: SessionUser },
) => Promise<Response>;
type PublicHandler<P> = (req: NextRequest, ctx: { params: P; db: DB }) => Promise<Response>;

export function errorResponse(err: unknown) {
  if (err instanceof AppError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } },
      { status: err.status },
    );
  }
  if (err instanceof ZodError) {
    const first = err.issues[0];
    return NextResponse.json(
      { error: { code: "validation_error", message: first?.message ?? "Invalid request.", issues: err.issues } },
      { status: 400 },
    );
  }
  console.error("[api] unhandled error", err);
  return NextResponse.json(
    { error: { code: "internal_error", message: "Something went wrong. Please try again." } },
    { status: 500 },
  );
}

export function withAuth<P = Record<string, never>>(handler: Handler<P>) {
  return async (req: NextRequest, ctx: Ctx<P>) => {
    try {
      const user = await readSessionToken(req.cookies.get(SESSION_COOKIE)?.value);
      if (!user) throw unauthorized();
      const db = await getDb();
      return await handler(req, { params: await ctx.params, db, user });
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export function withPublic<P = Record<string, never>>(handler: PublicHandler<P>) {
  return async (req: NextRequest, ctx: Ctx<P>) => {
    try {
      const db = await getDb();
      return await handler(req, { params: await ctx.params, db });
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export async function readJson(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new AppError(400, "invalid_json", "Request body must be valid JSON.");
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function assertUuid(id: string, what = "Document") {
  if (!UUID_RE.test(id)) throw new AppError(404, "not_found", `${what} not found.`);
}
