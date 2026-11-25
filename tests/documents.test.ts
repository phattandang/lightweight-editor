/**
 * Integration tests for the document + sharing services against a real (embedded)
 * Postgres: migrations, SQL, and the access rules all run exactly as in production.
 */
import { beforeAll, describe, expect, it } from "vitest";
import type { DB } from "@/db";
import { createPgliteDb } from "@/db/pglite";
import { users } from "@/db/schema";
import {
  createDocument,
  getDocument,
  listDocumentsForUser,
  renameDocument,
  saveContent,
} from "@/lib/documents";
import { revokeShare, shareDocument } from "@/lib/sharing";

let db: DB;
let alice: string, bob: string, carol: string;

const doc = (text: string) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

beforeAll(async () => {
  db = await createPgliteDb("memory://", { seed: false });
  const rows = await db
    .insert(users)
    .values([
      { email: "alice@test.dev", name: "Alice", passwordHash: "x" },
      { email: "bob@test.dev", name: "Bob", passwordHash: "x" },
      { email: "carol@test.dev", name: "Carol", passwordHash: "x" },
    ])
    .returning();
  [alice, bob, carol] = rows.map((r) => r.id);
});

describe("documents and sharing", () => {
  it("full sharing lifecycle: private -> viewer -> editor -> revoked", async () => {
    const created = await createDocument(db, alice, { title: "Plan" });

    // Private by default.
    await expect(getDocument(db, bob, created.id)).rejects.toMatchObject({ status: 403 });

    // Viewer can read but not write.
    await shareDocument(db, alice, created.id, { email: "BOB@test.dev ", role: "viewer" });
    const asViewer = await getDocument(db, bob, created.id);
    expect(asViewer.role).toBe("viewer");
    await expect(
      saveContent(db, bob, created.id, { content: doc("hi"), version: 1 }),
    ).rejects.toMatchObject({ status: 403 });

    // Upgraded to editor: can write.
    await shareDocument(db, alice, created.id, { email: "bob@test.dev", role: "editor" });
    const saved = await saveContent(db, bob, created.id, { content: doc("Bob was here"), version: 1 });
    expect(saved.version).toBe(2);
    const reopened = await getDocument(db, alice, created.id);
    expect(JSON.stringify(reopened.doc.content)).toContain("Bob was here");

    // Editors cannot re-share.
    await expect(
      shareDocument(db, bob, created.id, { email: "carol@test.dev", role: "viewer" }),
    ).rejects.toMatchObject({ status: 403 });

    // Revoked.
    await revokeShare(db, alice, created.id, bob);
    await expect(getDocument(db, bob, created.id)).rejects.toMatchObject({ status: 403 });
  });

  it("rejects stale writes with 409 and allows an explicit overwrite", async () => {
    const d = await createDocument(db, alice, {});
    await saveContent(db, alice, d.id, { content: doc("tab A"), version: 1 }); // -> v2

    // A second tab still holding version 1 must not silently clobber tab A.
    const stale = await saveContent(db, alice, d.id, { content: doc("tab B"), version: 1 }).catch((e) => e);
    expect(stale.status).toBe(409);
    expect(stale.details.currentVersion).toBe(2);

    const forced = await saveContent(db, alice, d.id, { content: doc("tab B"), version: 1, force: true });
    expect(forced.version).toBe(3);
  });

  it("rename changes only the title, not the content version", async () => {
    const d = await createDocument(db, alice, {});
    await renameDocument(db, alice, d.id, "  Roadmap   2027 ");
    const { doc: after } = await getDocument(db, alice, d.id);
    expect(after.title).toBe("Roadmap 2027");
    expect(after.version).toBe(1);
    await expect(renameDocument(db, alice, d.id, "   ")).rejects.toMatchObject({ status: 400 });
  });

  it("rejects content that does not match the editor schema", async () => {
    const d = await createDocument(db, alice, {});
    const bad = { type: "doc", content: [{ type: "iframe", attrs: { src: "https://evil" } }] };
    await expect(saveContent(db, alice, d.id, { content: bad, version: 1 })).rejects.toMatchObject({
      status: 400,
    });
  });

  it("lists owned and shared documents separately", async () => {
    const mine = await createDocument(db, carol, { title: "Carol's doc" });
    const theirs = await createDocument(db, alice, { title: "Shared with Carol" });
    await shareDocument(db, alice, theirs.id, { email: "carol@test.dev", role: "viewer" });

    const lists = await listDocumentsForUser(db, carol);
    expect(lists.owned.map((d) => d.id)).toEqual([mine.id]);
    expect(lists.shared).toEqual([
      expect.objectContaining({ id: theirs.id, role: "viewer", ownerName: "Alice" }),
    ]);
  });

  it("cannot share with an unknown user or with the owner", async () => {
    const d = await createDocument(db, alice, {});
    await expect(
      shareDocument(db, alice, d.id, { email: "nobody@test.dev", role: "viewer" }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      shareDocument(db, alice, d.id, { email: "alice@test.dev", role: "editor" }),
    ).rejects.toMatchObject({ status: 400 });
  });
});
