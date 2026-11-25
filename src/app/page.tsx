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

  return (
    <>
      <RefreshOnRestore renderId={crypto.randomUUID()} />
      <AppHeader user={user} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <section aria-labelledby="new-heading" className="rounded-xl border border-border bg-page p-5">
          <h2 id="new-heading" className="text-sm font-medium text-muted">
            Start a new document
          </h2>
          <NewDocumentActions supportedLabel={SUPPORTED_LABEL} />
        </section>

        <section aria-labelledby="owned-heading" className="mt-8">
          <SectionHeading id="owned-heading" title="Owned by me" count={owned.length} />
          {owned.length === 0 ? (
            <EmptyState text="You haven't created any documents yet. Start a blank one or import a file above." />
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-page">
              {owned.map((d) => (
                <li key={d.id} className="flex items-center gap-3 px-4 py-3 hover:bg-background">
                  <DocIcon />
                  <Link href={`/docs/${d.id}`} className="min-w-0 flex-1">
                    <div className="truncate font-medium">{d.title}</div>
                    <div className="text-xs text-muted">
                      Edited <TimeAgo iso={d.updatedAt.toISOString()} />
                    </div>
                  </Link>
                  <span className="hidden sm:inline">
                    <RoleBadge role="owner" />
                  </span>
                  <DeleteDocumentButton id={d.id} title={d.title} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="shared-heading" className="mt-8">
          <SectionHeading id="shared-heading" title="Shared with me" count={shared.length} />
          {shared.length === 0 ? (
            <EmptyState text="Nothing has been shared with you yet. Documents others share with you will show up here." />
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-page">
              {shared.map((d) => (
                <li key={d.id}>
                  <Link href={`/docs/${d.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-background">
                    <DocIcon shared />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{d.title}</div>
                      <div className="flex items-center gap-1.5 text-xs text-muted">
                        <Avatar name={d.ownerName} size={16} />
                        <span className="truncate">
                          {d.ownerName} · edited <TimeAgo iso={d.updatedAt.toISOString()} />
                        </span>
                      </div>
                    </div>
                    <RoleBadge role={d.role} />
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
    <h2 id={id} className="mb-3 flex items-center gap-2 text-base font-semibold">
      {title}
      <span className="rounded-full bg-border/60 px-2 text-xs font-medium text-muted">{count}</span>
    </h2>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-border bg-page px-4 py-6 text-center text-sm text-muted">
      {text}
    </p>
  );
}

function DocIcon({ shared = false }: { shared?: boolean }) {
  return (
    <span className="relative shrink-0" aria-hidden="true">
      <svg width="28" height="28" viewBox="0 0 24 24">
        <path d="M6 2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill={shared ? "#5f6368" : "#1a73e8"} />
        <path d="M8 13h8M8 16.5h6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      {shared && (
        <svg className="absolute -bottom-1 -right-1" width="14" height="14" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="12" fill="#fff" />
          <path
            d="M16 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3zm-8 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3zm0 2c-2.3 0-7 1.2-7 3.5V19h14v-2.5C15 14.2 10.3 13 8 13zm8 0c-.3 0-.6 0-1 .1a4.2 4.2 0 0 1 2 3.4V19h6v-2.5c0-2.3-4.7-3.5-7-3.5z"
            fill="#5f6368"
          />
        </svg>
      )}
    </span>
  );
}
