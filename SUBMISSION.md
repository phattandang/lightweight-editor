# Submission: Lightweight Editor

## Links

| What                     | Where                                                   |
|--------------------------|---------------------------------------------------------|
| Live product             | https://lightweight-editor.vercel.app                                            |
| Source repository        | https://github.com/phattandang/lightweight-editor       |
| Submitted snapshot       | Git tag `submission-v1`. The zip in this folder is built from it. |
| Walkthrough video        | See `WALKTHROUGH_VIDEO.txt`                             |

## Test accounts (seeded)

Password for all accounts: **`demo1234`**. The sign-in page also has one-click buttons.

| User  | Email              | Pre-seeded state                                    |
|-------|--------------------|-----------------------------------------------------|
| Alice | `alice@ajaia.test` | Owns "Welcome to Lightweight Editor"                |
| Bob   | `bob@ajaia.test`   | Has **editor** access to Alice's welcome document   |
| Carol | `carol@ajaia.test` | Has **viewer** access to Alice's welcome document   |

## What's in this folder

| File / folder                    | Contents                                                                    |
|----------------------------------|-----------------------------------------------------------------------------|
| `lightweight-editor-source.zip`  | Complete source code: app, migrations, tests and config. No `node_modules`. |
| `README.md`                      | Features, local setup and run instructions, environment variables, tests, deployment |
| `ARCHITECTURE.md`                | Architecture note: priorities, design decisions, trade-offs, next steps     |
| `AI_WORKFLOW.md`                 | How AI tools were used and how their output was verified                    |
| `SUBMISSION.md`                  | This file                                                                   |
| `WALKTHROUGH_VIDEO.txt`          | URL of the walkthrough video                                                |

All the Markdown files are also at the root of the source code and the repository.

**Screenshots:** not included, because local setup needs no extra steps. `pnpm install && pnpm dev` runs with an embedded database, no environment variables, and demo accounts already seeded.

## Scope delivered

| Requirement                              | Status | Where to see it                                              |
|------------------------------------------|:------:|--------------------------------------------------------------|
| Create, rename, edit, save and reopen documents | ✅ | Dashboard → **Blank document**; click the title to rename     |
| Bold, italic, underline, headings, lists | ✅ | Editor toolbar and keyboard shortcuts                         |
| File upload                              | ✅ | Dashboard → **Import file** (.txt, .md, .docx, max 4 MB) → new editable document |
| Sharing: owner, grant access, owned vs shared | ✅ | **Share** button (owner); dashboard **Owned by me** / **Shared with me** |
| Persistence (documents, formatting, shares) | ✅ | Neon Postgres; reload any document                        |
| Validation and error handling            | ✅ | zod and schema validation on the API, inline UI errors, 409 conflict banner |
| Automated tests                          | ✅ | `pnpm test`: 17 tests, including integration tests on real Postgres (PGlite) |
| Live deployment                          | ✅ | https://lightweight-editor.vercel.app                                                  |
| Architecture note and AI workflow note   | ✅ | `ARCHITECTURE.md`, `AI_WORKFLOW.md`                           |

Beyond the brief: optimistic concurrency (409 instead of silent overwrites), owner, editor and viewer roles with read-only mode, schema-validated content (scripts in imported files are removed), and a local setup with no database to install.
