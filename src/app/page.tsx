import Link from "next/link";
import { AppHeader, Avatar } from "@/components/AppHeader";
import { DeleteDocumentButton, NewDocumentActions } from "@/components/DashboardActions";
import { RefreshOnRestore } from "@/components/RefreshOnRestore";
import { RoleBadge } from "@/components/RoleBadge";
import { TimeAgo } from "@/components/TimeAgo";
import { getDb } from "@/db";
import { listDocumentsForUser } from "@/lib/documents";
import { SUPPORTED_LABEL } from "@/lib/import";
import { requireUser } from "@/lib/session";

export default async function Dashboard() {
  const user = await requireUser();
  const { owned, shared } = await listDocumentsForUser(await getDb(), user.id);
  const firstName = user.name.split(" ")[0];

  return (
    <>
      <RefreshOnRestore renderId={crypto.randomUUID()} />
      <AppHeader user={user} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-10 sm:px-6">
        <section aria-labelledby="hello">
          <p className="text-sm font-medium text-muted">Your workspace</p>
          <h1 id="hello" className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            Hi {firstName}, <span className="text-gradient">what are we writing today?</span>
          </h1>
          <NewDocumentActions supportedLabel={SUPPORTED_LABEL} />
        </section>

        <section aria-labelledby="owned-heading" className="mt-12">
          <SectionHeading id="owned-heading" title="Owned by me" count={owned.length} />
          {owned.length === 0 ? (
            <EmptyState text="You haven't created any documents yet. Start a blank one or import a file above." />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {owned.map((d) => (
                <li key={d.id} className="card card-hover group relative">
                  <Link href={`/docs/${d.id}`} className="block p-5">
                    <DocIcon />
                    <div className="mt-4 truncate pr-8 font-medium">{d.title}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                      <RoleBadge role="owner" />
                      <span>
                        Edited <TimeAgo iso={d.updatedAt.toISOString()} />
                      </span>
                    </div>
                  </Link>
                  <div className="absolute right-3 top-3 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                    <DeleteDocumentButton id={d.id} title={d.title} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="shared-heading" className="mt-12">
          <SectionHeading id="shared-heading" title="Shared with me" count={shared.length} />
          {shared.length === 0 ? (
            <EmptyState text="Nothing has been shared with you yet. Documents others share with you will show up here." />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shared.map((d) => (
                <li key={d.id} className="card card-hover">
                  <Link href={`/docs/${d.id}`} className="block p-5">
                    <DocIcon shared />
                    <div className="mt-4 truncate font-medium">{d.title}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                      <RoleBadge role={d.role} />
                      <span className="truncate">
                        Edited <TimeAgo iso={d.updatedAt.toISOString()} />
                      </span>
                    </div>
                    <div className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-xs text-muted">
                      <Avatar name={d.ownerName} size={20} />
                      <span className="truncate">Shared by {d.ownerName}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}

function SectionHeading({ id, title, count }: { id: string; title: string; count: number }) {
  return (
    <h2 id={id} className="mb-4 flex items-center gap-2 text-lg font-semibold tracking-tight">
      {title}
      <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">{count}</span>
    </h2>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-border bg-white/50 px-4 py-10 text-center text-sm text-muted">
      {text}
    </p>
  );
}

function DocIcon({ shared = false }: { shared?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`grid h-11 w-11 place-items-center rounded-xl ${
        shared ? "bg-gradient-to-br from-sky-400 to-cyan-500" : "bg-gradient-to-br from-indigo-500 to-violet-500"
      } shadow-md shadow-indigo-500/20`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24">
        {shared ? (
          <path
            d="M16 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3zm-8 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3zm0 2c-2.3 0-7 1.2-7 3.5V19h14v-2.5C15 14.2 10.3 13 8 13zm8 0c-.3 0-.6 0-1 .1a4.2 4.2 0 0 1 2 3.4V19h6v-2.5c0-2.3-4.7-3.5-7-3.5z"
            fill="#fff"
          />
        ) : (
          <path d="M7 7h10M7 12h10M7 17h6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        )}
      </svg>
    </span>
  );
}
