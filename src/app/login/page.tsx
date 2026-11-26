import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { LoginForm } from "@/components/LoginForm";
import { DEMO_PASSWORD, SEED_USERS } from "@/db/seed";
import { getCurrentUser } from "@/lib/session";

const POINTS = [
  ["Write together", "Share with teammates as viewers or editors."],
  ["Never lose work", "Autosave with conflict protection on every edit."],
  ["Bring your files", "Import Word, Markdown or text; export PDF or Markdown."],
];

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/60 bg-white/60 shadow-2xl shadow-indigo-500/10 backdrop-blur-xl lg:grid-cols-2">
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-fuchsia-300/20 blur-3xl" />
          <div className="relative flex items-center gap-2.5 font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/20 ring-1 ring-white/30">✦</span>
            Lightweight Editor
          </div>
          <div className="relative">
            <h2 className="text-4xl font-semibold leading-tight tracking-tight">
              Docs that move
              <br />
              as fast as your team.
            </h2>
            <ul className="mt-8 space-y-4">
              {POINTS.map(([title, text]) => (
                <li key={title} className="flex gap-3">
                  <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/20 text-xs">✓</span>
                  <span>
                    <span className="font-medium">{title}.</span> <span className="text-white/80">{text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <p className="relative text-sm text-white/70">Built for the Ajaia product exercise.</p>
        </section>

        <section className="bg-white/80 p-8 sm:p-10">
          <div className="lg:hidden">
            <Logo className="text-lg" />
          </div>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight lg:mt-0">Welcome back</h1>
          <p className="mt-1 text-sm text-muted">Pick a demo account. Sign in as two different people to try sharing.</p>
          <LoginForm demoUsers={SEED_USERS.map((u) => ({ ...u }))} demoPassword={DEMO_PASSWORD} />
        </section>
      </div>
    </main>
  );
}
