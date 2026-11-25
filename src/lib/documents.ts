import { and, desc, eq, sql } from "drizzle-orm";
import type { JSONContent } from "@tiptap/core";
import type { DB } from "@/db";
import { documentShares, documents, users } from "@/db/schema";
import { can, resolveRole, type Action, type Role } from "./access";
import { EMPTY_DOC, normalizeTitle, validateContent } from "./content";
import { conflict, forbidden, notFound } from "./errors";

export type DocumentSummary = {
  id: string;
  title: string;
  updatedAt: Date;
};

export type SharedDocumentSummary = DocumentSummary & {
  role: "viewer" | "editor";
  ownerName: string;
  ownerEmail: string;
};

export async function listDocumentsForUser(db: DB, userId: string) {
  const owned: DocumentSummary[] = await db
    .select({ id: documents.id, title: documents.title, updatedAt: documents.updatedAt })
    .from(documents)
    .where(eq(documents.ownerId, userId))
    .orderBy(desc(documents.updatedAt));

  const shared: SharedDocumentSummary[] = await db
    .select({
      id: documents.id,
      title: documents.title,
      updatedAt: documents.updatedAt,
      role: documentShares.role,
      ownerName: users.name,
      ownerEmail: users.email,
    })
    .from(documentShares)
    .innerJoin(documents, eq(documentShares.documentId, documents.id))
    .innerJoin(users, eq(documents.ownerId, users.id))
    .where(eq(documentShares.userId, userId))
    .orderBy(desc(documents.updatedAt));

  return { owned, shared };
}

export async function createDocument(
  db: DB,
  userId: string,
  input: { title?: string; content?: unknown } = {},
) {
  const title = input.title === undefined ? "Untitled document" : normalizeTitle(input.title);
  const content = input.content === undefined ? EMPTY_DOC : validateContent(input.content);
  const [doc] = await db.insert(documents).values({ ownerId: userId, title, content }).returning();
  return doc;
}

/** Loads a document and the caller's role, enforcing `action`. */
export async function authorize(db: DB, userId: string, docId: string, action: Action) {
  const [row] = await db
    .select({ doc: documents, shareRole: documentShares.role, ownerName: users.name, ownerEmail: users.email })
    .from(documents)
    .innerJoin(users, eq(documents.ownerId, users.id))
    .leftJoin(
      documentShares,
      and(eq(documentShares.documentId, documents.id), eq(documentShares.userId, userId)),
    )
    .where(eq(documents.id, docId));

  if (!row) throw notFound();
  const role = resolveRole(userId, row.doc, row.shareRole ? { role: row.shareRole } : null);
  if (!role) throw forbidden("You don't have access to this document. Ask the owner to share it with you.");
  if (!can(role, action)) {
    throw forbidden(
      role === "viewer" ? "You have view-only access to this document." : "Only the owner can do that.",
    );
  }
  return { doc: row.doc, role: role as Role, owner: { name: row.ownerName, email: row.ownerEmail } };
}

export async function getDocument(db: DB, userId: string, docId: string) {
  return authorize(db, userId, docId, "read");
}

/**
 * Saves content with optimistic concurrency: the write only lands if the client's
 * `version` matches the stored one. `force` = explicit last-write-wins overwrite.
 */
export async function saveContent(
  db: DB,
  userId: string,
  docId: string,
  input: { content: unknown; version: number; force?: boolean },
) {
  await authorize(db, userId, docId, "edit");
  const content = validateContent(input.content) as JSONContent;

  const where = input.force
    ? eq(documents.id, docId)
    : and(eq(documents.id, docId), eq(documents.version, input.version));

  const [updated] = await db
    .update(documents)
    .set({ content, version: sql`${documents.version} + 1`, updatedAt: sql`now()` })
    .where(where)
    .returning({ version: documents.version, updatedAt: documents.updatedAt });

  if (!updated) {
    const [current] = await db
      .select({ version: documents.version, updatedAt: documents.updatedAt })
      .from(documents)
      .where(eq(documents.id, docId));
    if (!current) throw notFound();
    throw conflict("This document was changed somewhere else since you opened it.", {
      currentVersion: current.version,
      updatedAt: current.updatedAt,
    });
  }
  return updated;
}

/** Rename touches only the title, so it never conflicts with content edits. */
export async function renameDocument(db: DB, userId: string, docId: string, rawTitle: unknown) {
  await authorize(db, userId, docId, "rename");
  const title = normalizeTitle(rawTitle);
  const [updated] = await db
    .update(documents)
    .set({ title, updatedAt: sql`now()` })
    .where(eq(documents.id, docId))
    .returning({ id: documents.id, title: documents.title, updatedAt: documents.updatedAt });
  return updated;
}

export async function deleteDocument(db: DB, userId: string, docId: string) {
  await authorize(db, userId, docId, "delete");
  await db.delete(documents).where(eq(documents.id, docId));
}
