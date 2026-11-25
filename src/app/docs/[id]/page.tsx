import Link from "next/link";
import type { JSONContent } from "@tiptap/core";
import { AppHeader } from "@/components/AppHeader";
import { DocumentEditor } from "@/components/editor/DocumentEditor";
import { RefreshOnRestore } from "@/components/RefreshOnRestore";
import { getDb } from "@/db";
import { getDocument } from "@/lib/documents";
import { AppError } from "@/lib/errors";
import { assertUuid } from "@/lib/http";
import { requireUser } from "@/lib/session";

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  let result: Awaited<ReturnType<typeof getDocument>>;
  try {
    assertUuid(id);
    result = await getDocument(await getDb(), user.id, id);
  } catch (err) {
    if (err instanceof AppError && (err.status === 403 || err.status === 404)) {
      return (
        <>
          <AppHeader user={user} />
          <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 text-center">
            <h1 className="text-xl font-semibold">
              {err.status === 404 ? "Document not found" : "You need access"}
            </h1>
            <p className="mt-2 text-sm text-muted">{err.message}</p>
            <p className="mt-1 text-xs text-muted">Signed in as {user.email}</p>
            <Link href="/" className="mt-6 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">
              Back to documents
            </Link>
          </main>
        </>
      );
    }
    throw err;
  }

  const { doc, role, owner } = result;
  return (
    <>
    <RefreshOnRestore renderId={crypto.randomUUID()} />
    <DocumentEditor
      // Remount with fresh content if a refresh brings a newer version.
      key={`${doc.id}:${doc.version}`}
      user={user}
      role={role}
      owner={owner}
      doc={{
        id: doc.id,
        title: doc.title,
        content: doc.content as JSONContent,
        version: doc.version,
        updatedAt: doc.updatedAt.toISOString(),
      }}
    />
    </>
  );
}
