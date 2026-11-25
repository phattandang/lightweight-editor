import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import type { DB } from "./index";
import { documentShares, documents, users } from "./schema";

export const DEMO_PASSWORD = "demo1234";

export const SEED_USERS = [
  { email: "alice@ajaia.test", name: "Alice Nguyen" },
  { email: "bob@ajaia.test", name: "Bob Tran" },
  { email: "carol@ajaia.test", name: "Carol Le" },
] as const;

const WELCOME_DOC = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Welcome to Lightweight Editor" }] },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "This document is owned by " },
        { type: "text", marks: [{ type: "bold" }], text: "Alice" },
        { type: "text", text: ", shared with Bob as an " },
        { type: "text", marks: [{ type: "italic" }], text: "editor" },
        { type: "text", text: " and with Carol as a " },
        { type: "text", marks: [{ type: "underline" }], text: "viewer" },
        { type: "text", text: "." },
      ],
    },
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Try it" }] },
    {
      type: "bulletList",
      content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Sign in as Bob and edit this page." }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Sign in as Carol and notice it is read-only." }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Import a .docx, .md or .txt file from the dashboard." }] }] },
      ],
    },
  ],
};

/** Idempotent: safe to run on every deploy. */
export async function seed(db: DB) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  await db
    .insert(users)
    .values(SEED_USERS.map((u) => ({ ...u, passwordHash })))
    .onConflictDoNothing({ target: users.email });

  const [alice] = await db.select().from(users).where(eq(users.email, SEED_USERS[0].email));
  const [bob] = await db.select().from(users).where(eq(users.email, SEED_USERS[1].email));
  const [carol] = await db.select().from(users).where(eq(users.email, SEED_USERS[2].email));

  const existing = await db.select({ id: documents.id }).from(documents).where(eq(documents.ownerId, alice.id)).limit(1);
  if (existing.length > 0) return;

  const [doc] = await db
    .insert(documents)
    .values({ ownerId: alice.id, title: "Welcome to Lightweight Editor", content: WELCOME_DOC })
    .returning({ id: documents.id });
  await db.insert(documentShares).values([
    { documentId: doc.id, userId: bob.id, role: "editor" },
    { documentId: doc.id, userId: carol.id, role: "viewer" },
  ]);
}
