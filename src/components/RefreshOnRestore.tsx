"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const seenRenders = new Set<string>();

/**
 * Browser back/forward restores the router's cached server render, which can be stale
 * (e.g. a document created since is missing from the dashboard). Each server render
 * carries a unique id; if we mount with an id we've already shown, it's a restore,
 * so fetch a fresh render. `own` guards against React StrictMode's double effect.
 */
export function RefreshOnRestore({ renderId }: { renderId: string }) {
  const router = useRouter();
  const own = useRef(false);
  useEffect(() => {
    if (seenRenders.has(renderId) && !own.current) {
      router.refresh();
    } else {
      seenRenders.add(renderId);
      own.current = true;
    }
  }, [renderId, router]);
  return null;
}
