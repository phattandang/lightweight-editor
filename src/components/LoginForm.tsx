"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { Avatar } from "./AppHeader";

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
      const hint =
        err instanceof ApiError && err.code === "invalid_credentials"
          ? " Demo accounts use @ajaia.test addresses (e.g. alice@ajaia.test / demo1234)."
          : "";
      setError((err instanceof ApiError ? err.message : "Sign in failed.") + hint);
      setBusy(false);
    }
  }

  return (
    <div className="mt-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Choose a demo account</p>
        <div className="mt-2 grid gap-2">
          {demoUsers.map((u) => (
            <button
              key={u.email}
              type="button"
              disabled={busy}
              onClick={() => signIn(u.email, demoPassword)}
              className="card card-hover flex items-center gap-3 px-3.5 py-3 text-left text-sm disabled:opacity-60"
            >
              <Avatar name={u.name} size={34} />
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block font-medium">Continue as {u.name.split(" ")[0]}</span>
                <span className="block truncate text-xs text-muted">{u.email}</span>
              </span>
              <span aria-hidden="true" className="text-muted">→</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          Password for all demo accounts: <code className="font-mono">{demoPassword}</code>
        </p>
      </div>

      <div className="my-5 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" />
        or sign in with email
        <span className="h-px flex-1 bg-border" />
      </div>

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
            placeholder="alice@ajaia.test"
            required
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-white/80 px-3.5 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15"
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
            className="mt-1 w-full rounded-xl border border-border bg-white/80 px-3.5 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15"
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
          className="btn-gradient w-full rounded-xl px-3 py-2.5 text-sm font-medium disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
