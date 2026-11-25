import { NextResponse } from "next/server";
import { withAuth } from "@/lib/http";
import { listDirectory } from "@/lib/sharing";

export const GET = withAuth(async (_req, { db, user }) => {
  return NextResponse.json({ users: await listDirectory(db, user.id) });
});
