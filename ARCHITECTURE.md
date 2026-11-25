# Architecture note

## What I prioritized, and why

The timebox was about 3.5 hours, so I put the effort where a document tool earns or loses trust, and kept the rest simple.

1. **Never lose or silently overwrite someone's work.** Editors expect this before anything else. Saves happen automatically and often. Every save carries a version number, so a save based on an outdated copy is rejected with a 409 and shown to the user, instead of the last writer silently winning.
2. **Access control that is real, not cosmetic.** Every read and write goes through one server-side policy: owner, editor or viewer. The UI hides controls a user can't use, but the server is what enforces the rules.
3. **One document format, enforced at the boundary.** Content is stored as TipTap/ProseMirror JSON. Every save and every import is validated against the editor's own schema, so stored content is always renderable and can't carry markup the editor doesn't understand, such as `<script>`.
4. **Make review effortless.** The demo accounts come with a pre-shared document and one-click sign-in. Running locally needs no database. The deployment is live.

**Deliberately out of scope:** real-time co-editing, comments, version history, attachments, public link sharing, sign-up, and password reset. Each would have been shallow in this timebox, and none is needed to show the core flows working well.

## From the initial design to what shipped

The initial design had User → API Gateway → (Document Create/Edit Service, File Upload Service) → Postgres, with JSON content and shares stored as (doc_id, user_id, role). I kept the logical boundaries but shipped them as **one deployable Next.js app**. Separate services would have meant extra deploys, cross-origin (CORS) configuration and service-to-service auth, with no benefit at this scale. The boundaries live in code, so they can be split out later.

```
Browser: Next.js pages + TipTap editor
   |  fetch /api/*   (httpOnly, SameSite=Lax session cookie)
   v
Next.js on Vercel
   lib/http.ts  withAuth()          <- the "API gateway": auth, validation, error -> HTTP status
   |-- /api/documents/**            -> lib/documents.ts  (create, save, rename, delete)
   |-- /api/documents/import        -> lib/import.ts     (the "File Upload Service")
   |-- /api/documents/:id/shares/** -> lib/sharing.ts
   '-- lib/access.ts                <- one owner/editor/viewer policy used by every service
   v
Postgres: Neon in production | PGlite (embedded) for local dev and tests
```

| Initial design | Shipped | Reason |
|---|---|---|
| API Gateway + 2 services | One app; a `withAuth` wrapper plus service modules | Same separation without the operational cost |
| Postgres, JSON content | Neon Postgres, `jsonb` TipTap JSON | JSON is the editor's native format and is schema-checkable |
| Tables: users, documents, shares, attachments | users, documents, document_shares | Attachments need blob storage, and import already covers the upload requirement |
| 409 by comparing `updated_at` | Integer `version` column | Postgres stores timestamps to the microsecond and JavaScript dates only to the millisecond, so equality checks give false conflicts |
| Shareable URL with edit/read access | The document URL is the link, but access is *restricted* to granted users | A clear, safe default. Public links are a cut feature |

## Data model

```
users           (id uuid PK, email unique, name, password_hash, created_at)
documents       (id uuid PK, owner_id FK -> users, title, content jsonb, version int,
                 created_at, updated_at)
document_shares (document_id FK, user_id FK, role enum('viewer','editor'), created_at,
                 PK (document_id, user_id))
```

Ownership is a column, not a share row, so a document always has exactly one owner and the owner can't be "unshared". Deleting a document cascades to its shares.

| Role   | Read | Edit content | Rename | Share / revoke | Delete |
|--------|:----:|:------------:|:------:|:--------------:|:------:|
| Owner  |  ✓   |      ✓       |   ✓    |       ✓        |   ✓    |
| Editor |  ✓   |      ✓       |   ✓    |                |        |
| Viewer |  ✓   |              |        |                |        |

## Key flows

**Save (autosave).** The client debounces edits for 1.5 s and also saves when the editor loses focus, when the tab is hidden or closing, and on Ctrl+S. It sends `PUT /api/documents/:id {content, version}`. The server checks the caller's role, validates the content against the schema and a 1 MB limit, then runs `UPDATE … SET version = version + 1 WHERE id = $1 AND version = $2 RETURNING version`. If no row matches, the version was stale, and the server returns **409** with the current version. The client then stops autosaving and offers **Load latest** or **Keep mine**; *Keep mine* sends `force: true`, an explicit last-write-wins. Edits made while a save is in flight are tracked by a sequence number and saved in a follow-up request, so they are never dropped. Network errors and 5xx responses retry automatically.

**Rename.** `PATCH {title}` updates only the title, so renaming never conflicts with content edits.

**Import.** A multipart upload is checked for extension, size (4 MB, under Vercel's 4.5 MB request limit), emptiness, binary content and, for `.docx`, the zip signature. The file is converted to HTML (mammoth for `.docx`, marked for `.md`, escaped paragraphs for `.txt`). The HTML is then parsed **through the editor schema** on the server with `@tiptap/html`, and anything outside the schema is removed. Only the resulting JSON is stored, never raw HTML.

**Sharing.** The owner grants a role by email, which creates or updates the share row (an upsert), and can change or revoke it. The dashboard runs two queries: documents the user owns, and documents joined through their share rows.

## Security notes

- Passwords are hashed with bcrypt. Sessions are HS256-signed JWTs in an `httpOnly`, `SameSite=Lax` cookie (`Secure` in production). Lax cookies aren't sent on cross-site POST, PUT or DELETE requests, which blocks CSRF against the API.
- Authorization is enforced in the service layer on every operation, not just in the UI. Users without access get 403. Malformed IDs and missing documents get 404.
- Input is validated with zod at the API edge and with the editor schema for content. Errors return consistent JSON (`{error: {code, message}}`) with no stack traces.
- Stored content can only contain node types the editor defines, so content shared between users can't inject scripts.

## Testing strategy

The highest-risk logic (permissions, concurrency and import conversion) sits in plain service functions that take the database as a parameter. The integration tests run those functions against an **in-memory PGlite**: real Postgres SQL and the real migrations, with no Docker and no network. They run in about 5 seconds on any machine. Pure policy tests cover the permission rules. Import tests feed real Markdown, text and `.docx` files through the same pipeline production uses.

## What I would do next

1. **Real-time co-editing:** Yjs CRDTs with TipTap's collaboration extension, synced through a WebSocket server such as Hocuspocus on Fly.io or Railway, since Vercel functions can't hold sockets open. The JSON and schema choice carries over directly. Presence cursors would come with it.
2. **Version history:** append a snapshot row on each save, or periodically, which allows restore and diff views. The `version` column is already the hook for this.
3. **Comments and suggestions**, anchored to positions in the document.
4. **Attachments and images:** direct-to-storage uploads (for example Vercel Blob or S3) to get around the request-size limit, plus an image node in the schema.
5. **Production identity:** OAuth or SSO, org-scoped user directories, "anyone in the org with the link" sharing, rate limiting on login, and an audit log of sharing changes.
6. **End-to-end tests** (Playwright) for the two-user sharing flow, and error monitoring (for example Sentry).
