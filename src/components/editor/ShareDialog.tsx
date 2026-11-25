"use client";

import { useRef, useState, type FormEvent } from "react";
import { Avatar } from "@/components/AppHeader";
import { api, ApiError } from "@/lib/api-client";

type Share = { userId: string; name: string; email: string; role: "viewer" | "editor" };
type DirUser = { id: string; name: string; email: string };

const byName = (a: Share, b: Share) => a.name.localeCompare(b.name);
const message = (err: unknown) => (err instanceof ApiError ? err.message : "Something went wrong.");

export function ShareDialog({ docId, docTitle, owner }: { docId: string; docTitle: string; owner: { name: string; email: string } }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [shares, setShares] = useState<Share[] | null>(null);
  const [directory, setDirectory] = useState<DirUser[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "editor">("editor");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function open() {
    ref.current?.showModal();
    setError(null);
    setNotice(null);
    try {
      const [s, d] = await Promise.all([
        api<{ shares: Share[] }>(`/api/documents/${docId}/shares`),
        api<{ users: DirUser[] }>("/api/users"),
      ]);
      setShares(s.shares);
      setDirectory(d.users);
    } catch (err) {
      setError(message(err));
    }
  }

  async function grant(targetEmail: string, targetRole: "viewer" | "editor") {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const { share } = await api<{ share: Share }>(`/api/documents/${docId}/shares`, {
        method: "POST",
        json: { email: targetEmail, role: targetRole },
      });
      setShares((prev) => [...(prev ?? []).filter((x) => x.userId !== share.userId), share].sort(byName));
      setNotice(`${share.name} can now ${share.role === "editor" ? "edit" : "view"} this document.`);
      return true;
    } catch (err) {
      setError(message(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (await grant(email, role)) setEmail("");
  }

  async function remove(s: Share) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api(`/api/documents/${docId}/shares/${s.userId}`, { method: "DELETE" });
      setShares((prev) => (prev ?? []).filter((x) => x.userId !== s.userId));
      setNotice(`Removed access for ${s.name}.`);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }

  const sharedIds = new Set((shares ?? []).map((s) => s.userId));
  const suggestions = directory.filter((u) => !sharedIds.has(u.id));

  return (
    <>
      <button
        onClick={open}
        className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 11V7a4 4 0 1 1 8 0M5 11h14v10H5z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
        Share
      </button>
      <dialog
        ref={ref}
        aria-labelledby="share-title"
        className="m-auto w-[min(540px,calc(100vw-32px))] rounded-xl bg-page p-0 text-foreground shadow-2xl"
      >
        <div className="p-6">
          <h2 id="share-title" className="truncate text-lg font-semibold">
            Share “{docTitle}”
          </h2>

          <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              required
              list="share-directory"
              placeholder="Add people by email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label="Email address"
              className="min-w-0 flex-1 rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
            <datalist id="share-directory">
              {suggestions.map((u) => (
                <option key={u.id} value={u.email}>
                  {u.name}
                </option>
              ))}
            </datalist>
            <div className="flex gap-2">
              <select
                aria-label="Access level"
                value={role}
                onChange={(e) => setRole(e.target.value as "viewer" | "editor")}
                className="rounded-md border border-border px-2 py-2 text-sm"
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              <button
                type="submit"
                disabled={busy || !email}
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
              >
                Share
              </button>
            </div>
          </form>

          {suggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted">
              Suggestions:
              {suggestions.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setEmail(u.email)}
                  className="rounded-full border border-border px-2 py-0.5 hover:bg-accent-soft"
                >
                  {u.name}
                </button>
              ))}
            </div>
          )}

          {error && (
            <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}
          {notice && !error && (
            <p role="status" className="mt-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
              {notice}
            </p>
          )}

          <h3 className="mt-5 text-sm font-medium">People with access</h3>
          <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto">
            <li className="flex items-center gap-3 py-1.5">
              <Avatar name={owner.name} />
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-sm font-medium">{owner.name} (you)</div>
                <div className="truncate text-xs text-muted">{owner.email}</div>
              </div>
              <span className="text-sm text-muted">Owner</span>
            </li>
            {shares === null && !error && <li className="py-2 text-sm text-muted">Loading…</li>}
            {shares?.map((s) => (
              <li key={s.userId} className="flex items-center gap-3 py-1.5">
                <Avatar name={s.name} />
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="truncate text-sm font-medium">{s.name}</div>
                  <div className="truncate text-xs text-muted">{s.email}</div>
                </div>
                <select
                  aria-label={`Access for ${s.name}`}
                  value={s.role}
                  disabled={busy}
                  onChange={(e) => grant(s.email, e.target.value as "viewer" | "editor")}
                  className="rounded-md border border-transparent px-1 py-1 text-sm hover:border-border"
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => remove(s)}
                  aria-label={`Remove ${s.name}`}
                  title="Remove access"
                  className="rounded-md p-1 text-muted hover:bg-red-50 hover:text-danger"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted">
              <span className="font-medium text-foreground">Restricted:</span> only people added above can open the link.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(window.location.href).catch(() => {});
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-background"
              >
                {copied ? "Link copied" : "Copy link"}
              </button>
              <button
                type="button"
                onClick={() => ref.current?.close()}
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
