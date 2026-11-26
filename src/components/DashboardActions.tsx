"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { api, ApiError } from "@/lib/api-client";

const MAX_BYTES = 4 * 1024 * 1024;
const ACCEPT = ".txt,.md,.markdown,.docx";

export function NewDocumentActions({ supportedLabel }: { supportedLabel: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<null | "create" | "import">(null);
  const [error, setError] = useState<string | null>(null);

  async function createBlank() {
    setBusy("create");
    setError(null);
    try {
      const { document } = await api<{ document: { id: string } }>("/api/documents", { method: "POST" });
      router.push(`/docs/${document.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the document.");
      setBusy(null);
    }
  }

  async function importFile(file: File) {
    setError(null);
    const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
    if (![".txt", ".md", ".markdown", ".docx"].includes(ext)) {
      setError(`"${file.name}" isn't supported. Supported: ${supportedLabel}.`);
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`"${file.name}" is larger than 4 MB.`);
      return;
    }
    setBusy("import");
    try {
      const form = new FormData();
      form.append("file", file);
      const { document } = await api<{ document: { id: string } }>("/api/documents/import", {
        method: "POST",
        body: form,
      });
      router.push(`/docs/${document.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Import failed.");
      setBusy(null);
    }
  }

  return (
    <div className="mt-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          onClick={createBlank}
          disabled={busy !== null}
          className="btn-gradient group flex items-center gap-4 rounded-2xl p-5 text-left disabled:opacity-60"
        >
          <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/20 text-2xl ring-1 ring-white/30 transition group-hover:scale-105">
            +
          </span>
          <span>
            <span className="block text-base font-semibold">{busy === "create" ? "Creating…" : "Blank document"}</span>
            <span className="block text-sm text-white/80">Start from an empty page</span>
          </span>
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy !== null}
          className="card card-hover group flex items-center gap-4 p-5 text-left disabled:opacity-60"
        >
          <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent transition group-hover:scale-105">
            <svg width="22" height="22" viewBox="0 0 24 24">
              <path d="M12 16V4m0 0-4 4m4-4 4 4M5 20h14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span>
            <span className="block text-base font-semibold">{busy === "import" ? "Importing…" : "Import a file"}</span>
            <span className="block text-sm text-muted">{supportedLabel}</span>
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) importFile(file);
          }}
        />
      </div>
      <p className="mt-2 text-xs text-muted">
        Import turns a file into a new editable document. Supported: {supportedLabel}. Headings, lists, bold, italic and
        underline are kept; images and tables are not imported.
      </p>
      {error && (
        <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function DeleteDocumentButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      aria-label={`Delete ${title}`}
      title="Delete"
      disabled={busy}
      onClick={async () => {
        if (!confirm(`Delete "${title}"? This also removes access for everyone it's shared with.`)) return;
        setBusy(true);
        try {
          await api(`/api/documents/${id}`, { method: "DELETE" });
          router.refresh();
        } catch (err) {
          alert(err instanceof ApiError ? err.message : "Could not delete the document.");
        } finally {
          setBusy(false);
        }
      }}
      className="rounded-md p-1.5 text-muted hover:bg-red-50 hover:text-danger disabled:opacity-50"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
