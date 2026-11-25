"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/api-client";

type DemoUser = { email: string; name: string };

export function LoginForm({ demoUsers, demoPassword }: { demoUsers: DemoUser[]; demoPassword: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn(e: string, p: string) {
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/login", { method: "POST", json: { email: e, password: p } });
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign in failed.");
      setBusy(false);
    }
  }

  return (
    <div className="mt-5">
      <form
        className="space-y-3"
        onSubmit={(ev) => {
          ev.preventDefault();
          signIn(email, password);
        }}
      >
        <label className="block">
          <span className="text-sm font-medium">Email</span>
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </label>
        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="mt-6 border-t border-border pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Quick sign in (demo)</p>
        <div className="mt-2 grid gap-2">
          {demoUsers.map((u) => (
            <button
              key={u.email}
              type="button"
              disabled={busy}
              onClick={() => signIn(u.email, demoPassword)}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-accent-soft disabled:opacity-60"
            >
              <span className="font-medium">{u.name}</span>
              <span className="text-muted">{u.email}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          Password for all demo accounts: <code className="font-mono">{demoPassword}</code>
        </p>
      </div>
    </div>
  );
}
