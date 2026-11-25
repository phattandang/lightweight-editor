# AI workflow note

## Tools

- **Claude Code** (Claude Opus 5.5) as a coding agent in VS Code. It had terminal access to scaffold, install, run tests and the dev server, smoke-test the API with curl, and commit and push to GitHub. It also had web search to check library and platform facts.
- **Vercel and Neon dashboards**, operated by me: accounts, environment variables, deployment settings.

## How I worked with it

I ran it as a **human-in-the-loop agent loop**, not as autocomplete:

1. **I designed first.** I drew the system design (API gateway, edit and upload services, Postgres with JSON content, share roles) and wrote down the save behaviour I wanted: debounced autosave, a save-status indicator, `PUT` with role checks, last-write-wins with an optional 409 safeguard, and rename touching only the title.
2. **The AI critiqued the design and proposed a scoped plan.** It checked key assumptions with web searches before committing to them: TipTap v3's StarterKit includes Underline, `@tiptap/html` can convert HTML to JSON on the server, Vercel caps request bodies at 4.5 MB, and Neon has a free tier. It then proposed changes, which I approved:
   - Collapse the gateway and services into **one Next.js app**, with the same boundaries as code modules.
   - Use an **integer version** for conflicts instead of comparing `updated_at`, because Postgres timestamps (microseconds) and JavaScript dates (milliseconds) don't compare cleanly.
   - **Cut attachments**, since import satisfies the upload requirement.
   - Use **PGlite** so local runs and tests need no database. My machine had no Docker or psql.
3. **Phased build with checkpoints.** The agent built in phases. Each phase ended with a type check, lint, the test suite and a curl smoke test of the real API, then a push. I tested each pushed build in the browser and fed back what I found.
4. **I owned infrastructure and secrets.** I created the GitHub repo, the Vercel project and the Neon database, and set the environment variables. The agent never saw the production database credentials.

## Where human judgment mattered

- **Scope and priorities:** what to cut (real-time co-editing, attachments, public links) and what to go deep on (no lost edits, server-side permissions).
- **Catching real-world issues the agent couldn't see.** When I first tried the deployment, I was hitting Vercel's default **Deployment Protection** login wall, not the app's login. That would have blocked reviewers too. We disabled it, and the agent also made the demo accounts the most prominent option on the sign-in page.
- **Reviewing the generated code** for the permission matrix, the concurrency logic and the import sanitization, which are the parts a reviewer would probe.

## Where the AI's output needed correcting

- The agent's first smoke test of the dev server failed: PGlite doesn't create its parent data folder. It read the server log, found the cause, fixed it, and re-ran the test.
- The Next.js 16 scaffold enables `cacheComponents` by default. The agent read the docs bundled with the installed Next.js version, rather than relying on memory, and turned the flag off to keep rendering behaviour simple and predictable.
- Small regressions were found by review rather than by tests: the share dialog kept showing the old title after a rename, and Ctrl+S (save) overlapped Ctrl+Shift+S (strikethrough). Both were fixed.

## How I verified the AI's work

- **17 automated tests**, including integration tests against a real Postgres engine (PGlite) and a real `.docx` conversion.
- `tsc --noEmit` and ESLint on every phase.
- curl scripts against the running server covering sign-in, creating, saving, renaming, sharing, importing, and the error paths (401, 403, 415, invalid JSON, wrong password). The 409 conflict path is covered by the integration tests.
- A manual browser walkthrough of the two-user sharing flow on the deployed app.
