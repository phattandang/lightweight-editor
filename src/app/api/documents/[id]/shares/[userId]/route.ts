import { NextResponse } from "next/server";
import { assertUuid, withAuth } from "@/lib/http";
import { revokeShare } from "@/lib/sharing";

export const DELETE = withAuth<{ id: string; userId: string }>(async (_req, { db, user, params }) => {
  assertUuid(params.id);
  assertUuid(params.userId, "User");
  await revokeShare(db, user.id, params.id, params.userId);
  return new NextResponse(null, { status: 204 });
});
