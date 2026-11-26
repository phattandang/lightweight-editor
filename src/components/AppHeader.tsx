"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { Logo } from "./Logo";

export function AppHeader({ user }: { user: { name: string; email: string } }) {
  const router = useRouter();
  return (
    <header className="glass sticky top-0 z-20 border-b border-white/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="Home">
          <Logo />
        </Link>
        <div className="flex items-center gap-3">
          <div className="hidden text-right leading-tight sm:block">
            <div className="text-sm font-medium">{user.name}</div>
            <div className="text-xs text-muted">{user.email}</div>
          </div>
          <Avatar name={user.name} />
          <button
            onClick={async () => {
              await api("/api/auth/logout", { method: "POST" }).catch(() => {});
              router.replace("/login");
              router.refresh();
            }}
            className="rounded-md px-2 py-1 text-sm text-muted hover:bg-background hover:text-foreground"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

const COLORS = ["#1a73e8", "#188038", "#d93025", "#a142f4", "#e37400", "#007b83"];

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const color = COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white"
      style={{ width: size, height: size, background: color, fontSize: size * 0.4 }}
    >
      {initials}
    </span>
  );
}
