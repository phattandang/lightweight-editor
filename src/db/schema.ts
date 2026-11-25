import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const shareRole = pgEnum("share_role", ["viewer", "editor"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Untitled document"),
    /** TipTap / ProseMirror JSON document. */
    content: jsonb("content")
      .notNull()
      .default(sql`'{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb`),
    /** Monotonic counter used for optimistic concurrency on content saves. */
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("documents_owner_idx").on(t.ownerId)],
);

export const documentShares = pgTable(
  "document_shares",
  {
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: shareRole("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.documentId, t.userId] }),
    index("document_shares_user_idx").on(t.userId),
  ],
);

export type User = typeof users.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type DocumentShare = typeof documentShares.$inferSelect;
export type ShareRole = (typeof shareRole.enumValues)[number];
