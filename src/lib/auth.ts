import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { jwtVerify, SignJWT } from "jose";
import type { DB } from "@/db";
import { users } from "@/db/schema";
import { AppError } from "./errors";

export const SESSION_COOKIE = "le_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export type SessionUser = { id: string; name: string; email: string };

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET must be set in production.");
    }
    return new TextEncoder().encode("dev-only-insecure-session-secret-change-me");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT({ name: user.name, email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function readSessionToken(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (!payload.sub) return null;
    return { id: payload.sub, name: String(payload.name ?? ""), email: String(payload.email ?? "") };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};

let dummyHash: string | undefined;

export async function verifyCredentials(db: DB, email: string, password: string): Promise<SessionUser> {
  const [user] = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase()));
  // Compare even when the user is missing to keep timing roughly constant.
  dummyHash ??= bcrypt.hashSync("not-a-real-password", 10);
  const ok = await bcrypt.compare(password, user?.passwordHash ?? dummyHash);
  if (!user || !ok) throw new AppError(401, "invalid_credentials", "Incorrect email or password.");
  return { id: user.id, name: user.name, email: user.email };
}
