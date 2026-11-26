"use client";

import type { JSONContent } from "@tiptap/core";
import { useEffect, useRef, useState } from "react";
import { docToMarkdown } from "@/lib/export/markdown";
import { docToPdfDefinition, exportFileName } from "@/lib/export/pdf";

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** pdfmake + its embedded fonts (~1 MB) are only loaded when someone exports a PDF. */
async function downloadPdf(doc: JSONContent, title: string) {
  const [pdfMakeModule, fontsModule] = await Promise.all([
    import("pdfmake/build/pdfmake"),
    import("pdfmake/build/vfs_fonts"),
  ]);
  const pdfMake = (pdfMakeModule as unknown as { default?: typeof pdfMakeModule }).default ?? pdfMakeModule;
  const vfs = (fontsModule as unknown as { default?: Record<string, string> }).default ?? fontsModule;
  pdfMake.addVirtualFileSystem(vfs as Record<string, string>);
  await pdfMake.createPdf(docToPdfDefinition(doc, title)).download(exportFileName(title, "pdf"));
}

/** Exports what is on screen (including edits not yet autosaved). Available to every role. */
export function ExportMenu({ getDoc, title }: { getDoc: () => JSONContent | null; title: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function run(format: "md" | "pdf") {
    const doc = getDoc();
    if (!doc) return;
    setOpen(false);
    setError(null);
    setBusy(true);
    try {
      if (format === "md") {
        saveBlob(new Blob([docToMarkdown(doc)], { type: "text/markdown;charset=utf-8" }), exportFileName(title, "md"));
      } else {
        await downloadPdf(doc, title);
      }
    } catch (err) {
      console.error(err);
      setError(format === "pdf" ? "Couldn't create the PDF." : "Couldn't export Markdown.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/80 px-3 py-2 text-sm font-medium hover:bg-white disabled:opacity-60"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="hidden sm:inline">{busy ? "Preparing…" : "Download"}</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-2 w-52 overflow-hidden rounded-xl border border-border bg-page py-1 shadow-xl">
          <button role="menuitem" onClick={() => run("pdf")} className="block w-full px-3 py-2 text-left text-sm hover:bg-background">
            PDF document <span className="text-muted">(.pdf)</span>
          </button>
          <button role="menuitem" onClick={() => run("md")} className="block w-full px-3 py-2 text-left text-sm hover:bg-background">
            Markdown <span className="text-muted">(.md)</span>
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="absolute right-0 top-full mt-1 whitespace-nowrap rounded-md bg-red-50 px-2 py-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
