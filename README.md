# Lightweight Editor

A small collaborative document editor inspired by Google Docs. You can create, format, rename, import, and share documents, with owner, editor and viewer permissions, autosave, and conflict detection.

**Live demo:** https://lightweight-editor.vercel.app

## Demo accounts

All accounts use the password **`demo1234`**. The sign-in page also has one-click buttons for each account.

| User  | Email              | Starts with                                     |
|-------|--------------------|-------------------------------------------------|
| Alice | `alice@ajaia.test` | Owns "Welcome to Lightweight Editor"            |
| Bob   | `bob@ajaia.test`   | That doc is shared with him as **editor**       |
| Carol | `carol@ajaia.test` | That doc is shared with her as **viewer**       |

**Sharing flow in about one minute:** sign in as Alice, create a document, click **Share**, add `bob@ajaia.test` as Viewer, then sign out. Sign in as Bob: the document appears under **Shared with me** marked *View only*, with no toolbar. Change Bob to Editor as Alice, and Bob can now edit.

## Features

- **Documents:** create, rename (click the title), edit in the browser, delete (owner only). Reopening a document restores it exactly.
- **Rich text:** bold, italic, underline, strikethrough, Heading 1–3, bulleted and numbered lists, quotes, undo and redo, and keyboard shortcuts (Ctrl+B, I, U, and others).
- **Autosave:** about 1.5 s after you stop typing, plus when the editor loses focus, when the tab is hidden or closed, and on Ctrl+S. A status line shows *Unsaved changes*, *Saving…*, *Saved*, or an error with **Retry**.
- **Conflict detection:** if another tab or user saved first, your save is rejected with a 409 instead of silently overwriting theirs. A banner lets you **Load latest** or **Keep mine**.
- **File import:** upload **.txt, .md or .docx (max 4 MB)** to create a new editable document. Headings, lists, bold, italic and underline are kept. Images, tables, fonts and colours are dropped.
- **Sharing:** the owner grants **Viewer** or **Editor** access by email, can change it, or can revoke it. The dashboard separates **Owned by me** from **Shared with me**. Links are *restricted*: only people with access can open them.

## Run locally

**Prerequisites:** Node.js 20+ (tested on 22) and pnpm 10+. Run `corepack enable` to use the pinned pnpm version, or `npm i -g pnpm`.

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

**No database setup is needed.** When `DATABASE_URL` is not set, the app uses [PGlite](https://pglite.dev), real Postgres compiled to WebAssembly. Its data is stored in `./.data/pglite`, and on first use the app applies the migrations and seeds the demo accounts. To reset the database, stop the server and delete `.data/`.

### Using a real Postgres instead (optional)

```bash
echo DATABASE_URL=postgres://user:pass@host/db > .env.local   # e.g. a free Neon database
pnpm db:setup       # apply migrations + seed demo users (idempotent)
pnpm dev
```

### Environment variables

| Variable         | Required          | Purpose                                                                       |
|------------------|-------------------|-------------------------------------------------------------------------------|
| `DATABASE_URL`   | In production     | Postgres connection string (Neon pooled URL). Unset means embedded PGlite.    |
| `SESSION_SECRET` | In production     | Signs the session cookie (HS256). Use any long random string. A dev fallback is used locally. |
| `PGLITE_DIR`     | No                | Where PGlite stores data locally (default `./.data/pglite`).                  |

### Scripts

| Command            | What it does                                                               |
|--------------------|----------------------------------------------------------------------------|
| `pnpm dev`         | Start the dev server                                                       |
| `pnpm test`        | Run the Vitest suite (no database or network needed)                       |
| `pnpm typecheck`   | Run the TypeScript type check                                              |
| `pnpm lint`        | Run ESLint                                                                 |
| `pnpm db:setup`    | Migrate and seed the database at `DATABASE_URL` (skipped if unset)          |
| `pnpm db:generate` | Generate a new SQL migration after editing `src/db/schema.ts`              |
| `pnpm build`       | `db:setup` followed by `next build`, which is what Vercel runs             |

## Tests

```bash
pnpm test
```

17 tests across 3 files:

- **`tests/documents.test.ts`**: integration tests that run the real services, SQL and migrations on an in-memory PGlite Postgres. They cover the full sharing lifecycle (private, then viewer, then editor, then revoked), editors being unable to re-share, stale-version writes returning **409** and an explicit overwrite succeeding, rename not touching content, schema validation rejecting unknown nodes, owned and shared lists, and bad share targets.
- **`tests/import.test.ts`**: Markdown, plain text and a **real .docx** generated in the test are converted to editor JSON with structure and formatting kept. A `<script>` tag is checked to be removed. Unsupported, empty, binary and fake `.docx` files are rejected with clear errors.
- **`tests/access.test.ts`**: the owner, editor and viewer permission rules.

## Deployment (Vercel + Neon, both free tiers)

1. Import the GitHub repo into Vercel. The Next.js preset is detected automatically.
2. Set these environment variables for Production and Preview: `DATABASE_URL` (the Neon *pooled* connection string), `SESSION_SECRET`, and `ENABLE_EXPERIMENTAL_COREPACK=1`, so Vercel uses the pinned pnpm.
3. Under **Settings → Deployment Protection**, disable Vercel Authentication so reviewers can open the app.
4. Deploy. The build runs `pnpm db:setup`, which migrates and seeds the database, then `next build`. Every push to `main` redeploys.

## Project structure

```
src/
  app/
    api/                      # REST endpoints (each wrapped by lib/http.ts)
      auth/login, auth/logout
      documents/              # GET list, POST create
      documents/[id]/         # GET, PUT save content, PATCH rename, DELETE
      documents/[id]/shares/  # GET, POST grant/change; [userId] DELETE revoke
      documents/import/       # POST multipart upload -> new document
      users/                  # directory for the share dialog
    login/  docs/[id]/  page.tsx (dashboard)
  components/editor/          # DocumentEditor, Toolbar, ShareDialog, useAutosave
  db/                         # Drizzle schema, Neon/PGlite driver switch, seed
  lib/
    access.ts                 # owner/editor/viewer policy (pure, unit-tested)
    documents.ts, sharing.ts  # services: all reads/writes + authorization
    import.ts                 # .txt/.md/.docx -> HTML -> schema-validated JSON
    content.ts                # document schema validation + size limits
    auth.ts, session.ts       # bcrypt + signed httpOnly JWT cookie
    http.ts                   # auth, error and validation wrapper for every API route
drizzle/                      # SQL migrations
tests/                        # Vitest
```

## Known limitations

- There is no real-time co-editing. Concurrent edits are detected with a 409 and resolved by the user rather than merged. See [ARCHITECTURE.md](ARCHITECTURE.md) for why and what would come next.
- Accounts are seeded demo users. There is no sign-up or password reset.
- Import supports `.txt`, `.md` and `.docx` up to 4 MB, because Vercel functions accept at most 4.5 MB per request. Images and tables are not imported.
- Sharing is by email to existing users. There is no "anyone with the link" access.

## More

- [ARCHITECTURE.md](ARCHITECTURE.md): what I prioritized, the design decisions and the trade-offs.
- [AI_WORKFLOW.md](AI_WORKFLOW.md): how AI tools were used to build this.
- [SUBMISSION.md](SUBMISSION.md): what's included in the submission.
