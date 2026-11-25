import { NextResponse } from "next/server";
import { createDocument } from "@/lib/documents";
import { badRequest, payloadTooLarge } from "@/lib/errors";
import { withAuth } from "@/lib/http";
import { importFile, MAX_IMPORT_BYTES } from "@/lib/import";

export const runtime = "nodejs";

/** Upload a .txt / .md / .docx file and turn it into a new editable document. */
export const POST = withAuth(async (req, { db, user }) => {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_IMPORT_BYTES + 64 * 1024) throw payloadTooLarge("File is larger than the 4 MB limit.");

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw badRequest("Expected a multipart/form-data upload with a 'file' field.");
  }
  const file = form.get("file");
  if (!(file instanceof File)) throw badRequest("No file was uploaded.");

  const buffer = Buffer.from(await file.arrayBuffer());
  const { title, content } = await importFile(file.name, buffer);
  const doc = await createDocument(db, user.id, { title, content });
  return NextResponse.json({ document: { id: doc.id, title: doc.title } }, { status: 201 });
});
