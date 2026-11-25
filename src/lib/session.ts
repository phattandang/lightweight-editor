import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { readSessionToken, SESSION_COOKIE, type SessionUser } from "./auth";

/** Session for server components: valid token AND the user still exists. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const session = await readSessionToken(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const db = await getDb();
  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, session.id));
  return user ?? null;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
