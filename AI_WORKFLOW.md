# AI workflow note

## Tools

- **Claude Code** (Claude Opus 5.5) as a coding agent in VS Code. It had terminal access to scaffold, install, run tests and the dev server, smoke-test the API with curl, and commit and push to GitHub. It also had web search to check library and platform facts.
- **ChatGPT**, to help me draft the initial high-level system design, which I then brought to Claude Code to critique.
- **Vercel and Neon dashboards**, operated by me: accounts, environment variables, deployment settings.

## How I worked with it

I ran it as a **human-in-the-loop agent loop**, not as autocomplete:

1. **I designed first.** With help from ChatGPT on the draft, I drew the system design (API gateway, edit and upload services, Postgres with JSON content, share roles) and wrote down the save behaviour I wanted: debounced autosave, a save-status indicator, `PUT` with role checks, last-write-wins with an optional 409 safeguard, and rename touching only the title.
2. **The AI critiqued the design and proposed a scoped plan.** It checked key assumptions with web searches before committing to them: TipTap v3's StarterKit includes Underline, `@tiptap/html` can convert HTML to JSON on the server, Vercel caps request bodies at 4.5 MB, and Neon has a free tier. It then proposed changes, which I approved:
   - Collapse the gateway and services into **one Next.js app**, with the same boundaries as code modules.
   - Use an **integer version** for conflicts instead of comparing `updated_at`, because Postgres timestamps (microseconds) and JavaScript dates (milliseconds) don't compare cleanly.
   - **Cut attachments**, since import satisfies the upload requirement.
   - Use **PGlite** so local runs and tests need no database. My machine had no Docker or psql.
3. **Phased build with checkpoints.** The agent built in phases. Each phase ended with a type check, lint, the test suite and a curl smoke test of the real API, then a push. I tested each pushed build in the browser and fed back what I found.
4. **I owned infrastructure and secrets.** I created the GitHub repo, the Vercel project and the Neon database, and set the environment variables. The agent never saw the production database credentials.

## Where human judgment mattered

- **Scope and priorities:** what to cut (real-time co-editing, attachments, public links) and what to go deep on (no lost edits, server-side permissions).
- **Catching real-world issues the agent couldn't see.** Several problems only showed up on the real deployment, because I was the one using it in a browser:
  - A Vercel **Deployment Protection** login wall sat in front of the app, which would have blocked reviewers too. I disabled it, and the agent made the demo accounts the most prominent option on the sign-in page.
  - Every page returned Vercel's 404 because the project's framework preset was wrong (the repo held only a README when I first imported it). The agent diagnosed this by probing which paths were served, and pinned the framework in `vercel.json`.
  - Sign-in returned a 500 on production. The agent added an `/api/health` endpoint, which showed the database URL and session secret were not set on the Production environment. I fixed the Vercel configuration, including removing a duplicate project, and it then reported healthy.
  - New documents seemed to vanish from the dashboard after pressing Back. The agent confirmed against the production API that they were saved, traced it to the router restoring a stale cached page, and fixed it.
- **Reviewing the generated code** for the permission matrix, the concurrency logic and the import sanitization, which are the parts a reviewer would probe.

## Where the AI's output needed correcting

- The agent's first smoke test of the dev server failed: PGlite doesn't create its parent data folder. It read the server log, found the cause, fixed it, and re-ran the test.
- The Next.js 16 scaffold enables `cacheComponents` by default. The agent read the docs bundled with the installed Next.js version, rather than relying on memory, and turned the flag off to keep rendering behaviour simple and predictable.
- A Markdown round-trip test (export, then re-import) caught a bug in the original import: code blocks gained a blank last line. It was fixed with the export feature.
- Small regressions were found by review rather than by tests: the share dialog kept showing the old title after a rename, and Ctrl+S (save) overlapped Ctrl+Shift+S (strikethrough). Both were fixed.

## How I verified the AI's work

- **31 automated tests** across 5 files: API-level tests through the real route handlers, integration tests against a real Postgres engine (PGlite), a real `.docx` conversion, and an export round trip. GitHub Actions runs them, together with the type check, lint and a build, on every push.
- `tsc --noEmit` and ESLint on every phase.
- curl scripts against the running server covering sign-in, creating, saving, renaming, sharing, importing, and the error paths (401, 403, 415, invalid JSON, wrong password). The 409 conflict path is covered by the integration tests.
- A scripted smoke test against the production deployment: sign-in, saving and the 409 path, rename, sharing as viewer and as editor, blocked writes and re-shares (403), and import. The test documents were deleted afterwards.
- A manual browser walkthrough on the deployed app: typing, bold, italic, underline, strikethrough, deleting, sharing as viewer and as editor, and file import.
