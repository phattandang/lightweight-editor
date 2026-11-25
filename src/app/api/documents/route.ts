import { NextResponse } from "next/server";
import { z } from "zod";
import { createDocument, listDocumentsForUser } from "@/lib/documents";
import { withAuth } from "@/lib/http";

export const GET = withAuth(async (_req, { db, user }) => {
  return NextResponse.json(await listDocumentsForUser(db, user.id));
});

const CreateBody = z
  .object({ title: z.string().optional(), content: z.unknown().optional() })
  .optional();

export const POST = withAuth(async (req, { db, user }) => {
  const text = await req.text();
  const body = CreateBody.parse(text ? JSON.parse(text) : undefined) ?? {};
  const doc = await createDocument(db, user.id, body);
  return NextResponse.json({ document: doc }, { status: 201 });
});
