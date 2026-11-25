import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions, verifyCredentials } from "@/lib/auth";
import { readJson, withPublic } from "@/lib/http";

const LoginBody = z.object({
  email: z.string().trim().min(1, "Email is required."),
  password: z.string().min(1, "Password is required."),
});

export const POST = withPublic(async (req, { db }) => {
  const body = LoginBody.parse(await readJson(req));
  const user = await verifyCredentials(db, body.email, body.password);
  const res = NextResponse.json({ user });
  res.cookies.set(SESSION_COOKIE, await createSessionToken(user), sessionCookieOptions);
  return res;
});
