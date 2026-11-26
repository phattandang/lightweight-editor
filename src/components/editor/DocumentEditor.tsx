"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { Placeholder } from "@tiptap/extensions";
import type { JSONContent } from "@tiptap/core";
import { Avatar } from "@/components/AppHeader";
import { LogoMark } from "@/components/Logo";
import { RoleBadge } from "@/components/RoleBadge";
import { formatRelative } from "@/components/TimeAgo";
import { api, ApiError } from "@/lib/api-client";
import { baseExtensions } from "@/lib/editor/extensions";
import { ExportMenu } from "./ExportMenu";
import { ShareDialog } from "./ShareDialog";
import { Toolbar } from "./Toolbar";
import { useAutosave, type SaveState } from "./useAutosave";

type Props = {
  doc: { id: string; title: string; content: JSONContent; version: number; updatedAt: string };
  role: "owner" | "editor" | "viewer";
  owner: { name: string; email: string };
  user: { id: string; name: string; email: string };
};

export function DocumentEditor({ doc, role, owner, user }: Props) {
  const canEdit = role !== "viewer";
  const latest = useRef<JSONContent | null>(null);
  const [title, setTitle] = useState(doc.title);

  const autosave = useAutosave({
    docId: doc.id,
    initialVersion: doc.version,
    initialSavedAt: doc.updatedAt,
    enabled: canEdit,
    getContent: () => latest.current,
  });
  const autosaveRef = useRef(autosave);
  useEffect(() => {
    autosaveRef.current = autosave;
  });

  const editor = useEditor({
    extensions: [
      ...baseExtensions,
      Placeholder.configure({ placeholder: canEdit ? "Start typing…" : "This document is empty." }),
    ],
    content: doc.content,
    editable: canEdit,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "doc-content", "aria-label": "Document content", spellcheck: "true" },
    },
    onUpdate: ({ editor }) => {
      latest.current = editor.getJSON();
      autosaveRef.current.markDirty();
    },
    onBlur: () => void autosaveRef.current.flush(),
  });

  return (
    <div className="flex min-h-screen flex-col">
      <header className="glass sticky top-0 z-20 border-b border-white/60">
        <div className="flex items-center gap-3 px-3 pt-2 sm:px-4">
          <Link href="/" title="Back to documents" aria-label="Back to documents" className="shrink-0 rounded-md p-1 hover:bg-background">
            <LogoMark size={32} />
          </Link>
          <div className="min-w-0 flex-1">
            <TitleField docId={doc.id} initial={doc.title} canRename={canEdit} onSaved={setTitle} />
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 px-1 pb-1 text-xs text-muted">
              <RoleBadge role={role} />
              {role !== "owner" && <span>Owned by {owner.name}</span>}
              <span aria-hidden="true">·</span>
              <SaveIndicator status={autosave.status} canEdit={canEdit} onRetry={autosave.retry} />
            </div>
          </div>
          <ExportMenu getDoc={() => editor?.getJSON() ?? null} title={title} />
          {role === "owner" ? (
            <ShareDialog docId={doc.id} docTitle={title} owner={owner} />
          ) : null}
          <span title={`${user.name} (${user.email})`}>
            <Avatar name={user.name} />
          </span>
        </div>
        {canEdit && editor ? (
          <div className="flex justify-center overflow-x-auto px-3 pb-3 pt-1 sm:px-4">
            <Toolbar editor={editor} />
          </div>
        ) : (
          <div className="h-2" />
        )}
      </header>

      {autosave.status.kind === "conflict" && (
        <div role="alert" className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="mx-auto flex max-w-[816px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Someone else saved changes to this document after you opened it. Your latest edits have <b>not</b> been saved.
            </span>
            <span className="flex shrink-0 gap-2">
              <button
                onClick={() => window.location.reload()}
                className="rounded-md border border-amber-300 bg-white px-3 py-1.5 font-medium hover:bg-amber-100"
              >
                Load latest
              </button>
              <button
                onClick={() => void autosave.overwrite()}
                className="rounded-md bg-amber-600 px-3 py-1.5 font-medium text-white hover:bg-amber-700"
              >
                Keep mine
              </button>
            </span>
          </div>
        </div>
      )}
      {!canEdit && (
        <div className="border-b border-border bg-page px-4 py-2 text-center text-sm text-muted">
          You have view-only access. Ask {owner.name} ({owner.email}) for edit access.
        </div>
      )}

      <main className="flex-1 px-0 py-0 sm:px-6 sm:py-8">
        <div
          className="mx-auto min-h-[80vh] max-w-[816px] cursor-text bg-page px-5 py-8 sm:rounded-3xl sm:border sm:border-border sm:px-16 sm:py-14 sm:shadow-[0_1px_2px_rgb(15_23_42/0.04),0_24px_48px_-24px_rgb(79_70_229/0.25)]"
          onClick={(e) => {
            if (e.target === e.currentTarget && canEdit) editor?.commands.focus("end");
          }}
        >
          {editor ? <EditorContent editor={editor} /> : <EditorSkeleton />}
        </div>
      </main>
    </div>
  );
}

function TitleField({
  docId,
  initial,
  canRename,
  onSaved,
}: {
  docId: string;
  initial: string;
  canRename: boolean;
  onSaved: (title: string) => void;
}) {
  const [title, setTitle] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const saved = useRef(initial);

  useEffect(() => {
    document.title = `${title || "Untitled"} - Lightweight Editor`;
  }, [title]);

  async function commit() {
    const next = title.replace(/\s+/g, " ").trim();
    if (!next) {
      setTitle(saved.current);
      return;
    }
    if (next === saved.current) {
      setTitle(next);
      return;
    }
    setError(null);
    try {
      const res = await api<{ title: string }>(`/api/documents/${docId}`, { method: "PATCH", json: { title: next } });
      saved.current = res.title;
      setTitle(res.title);
      onSaved(res.title);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not rename.");
      setTitle(saved.current);
    }
  }

  if (!canRename) {
    return <h1 className="truncate px-1.5 py-0.5 text-xl font-semibold tracking-tight">{title}</h1>;
  }
  return (
    <div className="flex items-center gap-2">
      <input
        value={title}
        maxLength={200}
        aria-label="Document title"
        onChange={(e) => setTitle(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setTitle(saved.current);
            requestAnimationFrame(() => (e.target as HTMLInputElement).blur());
          }
        }}
        className="w-full min-w-0 max-w-xl rounded-lg border border-transparent bg-transparent px-1.5 py-0.5 text-xl font-semibold tracking-tight outline-none hover:border-border focus:border-accent focus:bg-white"
      />
      {error && (
        <span role="alert" className="shrink-0 text-xs text-danger">
          {error}
        </span>
      )}
    </div>
  );
}

function SaveIndicator({ status, canEdit, onRetry }: { status: SaveState; canEdit: boolean; onRetry: () => void }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  if (!canEdit) {
    return status.kind === "saved" ? <span suppressHydrationWarning>Last edited {formatRelative(status.at)}</span> : null;
  }
  switch (status.kind) {
    case "saved":
      return (
        <span className="inline-flex items-center gap-1" suppressHydrationWarning>
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
            <path d="m5 12 4 4 10-10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          Saved · {formatRelative(status.at)}
        </span>
      );
    case "dirty":
      return <span>Unsaved changes</span>;
    case "saving":
      return <span aria-live="polite">Saving…</span>;
    case "conflict":
      return <span className="font-medium text-amber-700">Not saved: conflict</span>;
    case "error":
      return (
        <span role="alert" className="inline-flex items-center gap-1 text-danger">
          Couldn&apos;t save: {status.message}
          <button onClick={onRetry} className="font-medium underline">
            Retry
          </button>
        </span>
      );
  }
}

function EditorSkeleton() {
  return (
    <div className="animate-pulse space-y-3" aria-label="Loading document">
      <div className="h-7 w-2/3 rounded bg-black/5" />
      <div className="h-4 w-full rounded bg-black/5" />
      <div className="h-4 w-5/6 rounded bg-black/5" />
      <div className="h-4 w-4/6 rounded bg-black/5" />
    </div>
  );
}
