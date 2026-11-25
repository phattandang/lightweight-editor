import { NextResponse } from "next/server";
import { z } from "zod";
import { assertUuid, readJson, withAuth } from "@/lib/http";
import { listShares, shareDocument } from "@/lib/sharing";

type P = { id: string };

export const GET = withAuth<P>(async (_req, { db, user, params }) => {
  assertUuid(params.id);
  return NextResponse.json({ shares: await listShares(db, user.id, params.id) });
});

const ShareBody = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")),
  role: z.enum(["viewer", "editor"], { message: "Role must be viewer or editor." }),
});

export const POST = withAuth<P>(async (req, { db, user, params }) => {
  assertUuid(params.id);
  const body = ShareBody.parse(await readJson(req));
  return NextResponse.json({ share: await shareDocument(db, user.id, params.id, body) }, { status: 201 });
});
