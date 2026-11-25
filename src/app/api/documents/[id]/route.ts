import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteDocument, getDocument, renameDocument, saveContent } from "@/lib/documents";
import { assertUuid, readJson, withAuth } from "@/lib/http";

type P = { id: string };

export const GET = withAuth<P>(async (_req, { db, user, params }) => {
  assertUuid(params.id);
  const { doc, role, owner } = await getDocument(db, user.id, params.id);
  return NextResponse.json({ document: doc, role, owner });
});

const SaveBody = z.object({
  content: z.unknown(),
  version: z.number().int().positive(),
  force: z.boolean().optional(),
});

/** Save content (autosave). 409 when `version` is stale unless `force`. */
export const PUT = withAuth<P>(async (req, { db, user, params }) => {
  assertUuid(params.id);
  const body = SaveBody.parse(await readJson(req));
  const saved = await saveContent(db, user.id, params.id, body);
  return NextResponse.json(saved);
});

const RenameBody = z.object({ title: z.string() });

/** Rename only - never touches content or version. */
export const PATCH = withAuth<P>(async (req, { db, user, params }) => {
  assertUuid(params.id);
  const body = RenameBody.parse(await readJson(req));
  return NextResponse.json(await renameDocument(db, user.id, params.id, body.title));
});

export const DELETE = withAuth<P>(async (_req, { db, user, params }) => {
  assertUuid(params.id);
  await deleteDocument(db, user.id, params.id);
  return new NextResponse(null, { status: 204 });
});
