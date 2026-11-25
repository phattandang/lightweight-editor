import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { LoginForm } from "@/components/LoginForm";
import { DEMO_PASSWORD, SEED_USERS } from "@/db/seed";
import { getCurrentUser } from "@/lib/session";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo className="text-lg" />
        </div>
        <div className="rounded-xl border border-border bg-page p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Sign in</h1>
          <p className="mt-1 text-sm text-muted">Use one of the demo accounts to try sharing between users.</p>
          <LoginForm demoUsers={SEED_USERS.map((u) => ({ ...u }))} demoPassword={DEMO_PASSWORD} />
        </div>
      </div>
    </main>
  );
}
