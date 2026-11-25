"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted">
        We couldn&apos;t load this page. Your saved documents are safe. Try again in a moment.
      </p>
      {error.digest && <p className="mt-1 font-mono text-xs text-muted">Ref: {error.digest}</p>}
      <div className="mt-6 flex gap-2">
        <button
          onClick={reset}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Try again
        </button>
        <Link href="/" className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-page">
          Back to documents
        </Link>
      </div>
    </main>
  );
}
