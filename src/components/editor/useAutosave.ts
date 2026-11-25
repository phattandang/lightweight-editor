"use client";

import type { JSONContent } from "@tiptap/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api-client";

export type SaveState =
  | { kind: "saved"; at: string }
  | { kind: "dirty" }
  | { kind: "saving" }
  | { kind: "error"; message: string }
  | { kind: "conflict" };

const AUTOSAVE_DELAY_MS = 1500;
const RETRY_DELAY_MS = 5000;

/**
 * Debounced autosave with optimistic concurrency.
 * - every edit bumps `editSeq`; a save records the seq it sent, so edits made while a
 *   request is in flight are never lost (they trigger a follow-up save)
 * - the server rejects stale versions with 409 -> we stop autosaving and surface a conflict
 * - transient failures (offline / 5xx) retry automatically; 4xx errors wait for the next edit
 */
export function useAutosave(opts: {
  docId: string;
  initialVersion: number;
  initialSavedAt: string;
  enabled: boolean;
  getContent: () => JSONContent | null;
}) {
  const [status, setStatus] = useState<SaveState>({ kind: "saved", at: opts.initialSavedAt });
  const optsRef = useRef(opts);
  useEffect(() => {
    optsRef.current = opts;
  });

  const s = useRef({
    version: opts.initialVersion,
    editSeq: 0,
    savedSeq: 0,
    inFlight: false,
    conflict: false,
    timer: undefined as ReturnType<typeof setTimeout> | undefined,
  });

  const ctl = useMemo(() => {
    const st = s.current;

    function schedule(delay = AUTOSAVE_DELAY_MS) {
      clearTimeout(st.timer);
      st.timer = setTimeout(() => void save(), delay);
    }

    async function save(force = false): Promise<void> {
      const { enabled, docId, getContent } = optsRef.current;
      if (!enabled || st.inFlight) return;
      if (st.conflict && !force) return;
      if (st.editSeq === st.savedSeq && !force) return;
      const content = getContent();
      if (!content) return;

      clearTimeout(st.timer);
      const seq = st.editSeq;
      st.inFlight = true;
      setStatus({ kind: "saving" });
      let ok = false;
      try {
        const res = await api<{ version: number; updatedAt: string }>(`/api/documents/${docId}`, {
          method: "PUT",
          json: { content, version: st.version, ...(force ? { force: true } : {}) },
        });
        ok = true;
        st.version = res.version;
        st.savedSeq = seq;
        st.conflict = false;
        setStatus(st.editSeq === seq ? { kind: "saved", at: res.updatedAt } : { kind: "dirty" });
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          st.conflict = true;
          setStatus({ kind: "conflict" });
        } else {
          setStatus({ kind: "error", message: err instanceof ApiError ? err.message : "Could not save." });
          const transient = !(err instanceof ApiError) || err.status === 0 || err.status >= 500;
          if (transient) schedule(RETRY_DELAY_MS);
        }
      } finally {
        st.inFlight = false;
      }
      // Edits that arrived while the request was in flight get their own save.
      if (ok && st.editSeq !== st.savedSeq) schedule();
    }

    return {
      markDirty() {
        st.editSeq++;
        if (st.conflict) return;
        setStatus({ kind: "dirty" });
        schedule();
      },
      flush: () => save(),
      retry: () => save(),
      overwrite: () => save(true),
      hasUnsaved: () => st.editSeq !== st.savedSeq || st.inFlight,
      isConflict: () => st.conflict,
      cancel: () => clearTimeout(st.timer),
    };
  }, []);

  // Save when the tab is hidden / closed; warn if edits could be lost.
  useEffect(() => {
    if (!opts.enabled) return;
    const onHide = () => {
      if (document.visibilityState === "hidden") void ctl.flush();
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!ctl.hasUnsaved() || ctl.isConflict()) return;
      void ctl.flush(); // keepalive request survives the unload
      e.preventDefault();
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void ctl.flush();
      }
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("keydown", onKey);
      // Client-side navigation away: persist whatever is pending.
      if (ctl.hasUnsaved()) void ctl.flush();
      ctl.cancel();
    };
  }, [ctl, opts.enabled]);

  return { status, ...ctl };
}
