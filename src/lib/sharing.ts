import { and, asc, eq, ne } from "drizzle-orm";
import type { DB } from "@/db";
import { documentShares, users, type ShareRole } from "@/db/schema";
import { authorize } from "./documents";
import { badRequest, notFound } from "./errors";

export async function listShares(db: DB, userId: string, docId: string) {
  await authorize(db, userId, docId, "share");
  return db
    .select({ userId: users.id, name: users.name, email: users.email, role: documentShares.role })
    .from(documentShares)
    .innerJoin(users, eq(documentShares.userId, users.id))
    .where(eq(documentShares.documentId, docId))
    .orderBy(asc(users.name));
}

/** Grant (or change) access for the user with `email`. Owner only. */
export async function shareDocument(
  db: DB,
  userId: string,
  docId: string,
  input: { email: string; role: ShareRole },
) {
  const { doc } = await authorize(db, userId, docId, "share");
  const email = input.email.trim().toLowerCase();
  const [target] = await db.select().from(users).where(eq(users.email, email));
  if (!target) throw notFound(`No user with the email ${email}.`);
  if (target.id === doc.ownerId) throw badRequest("The owner already has full access.");

  await db
    .insert(documentShares)
    .values({ documentId: docId, userId: target.id, role: input.role })
    .onConflictDoUpdate({
      target: [documentShares.documentId, documentShares.userId],
      set: { role: input.role },
    });
  return { userId: target.id, name: target.name, email: target.email, role: input.role };
}

export async function revokeShare(db: DB, userId: string, docId: string, targetUserId: string) {
  await authorize(db, userId, docId, "share");
  await db
    .delete(documentShares)
    .where(and(eq(documentShares.documentId, docId), eq(documentShares.userId, targetUserId)));
}

/** Small org directory so the share dialog can suggest people. */
export async function listDirectory(db: DB, excludeUserId: string) {
  return db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(ne(users.id, excludeUserId))
    .orderBy(asc(users.name));
}
