# Wrote

Open-source, AI-native book writing app. Concept: `docs/CONCEPT.md`. Backlog: Plane project **WRO** (Wrote).

## Stack

- **Nuxt 4** (`app/`, `server/`, `shared/`), **Nuxt UI 4** (Tailwind v4), TypeScript strict, pnpm
- Theme: `primary: 'yellow'`, `neutral: 'zinc'`, dark mode first
- Layout: `USidebar` app shell (`variant="inset"`, `collapsible="icon"`, `rail`) + right `USidebar` for the assistant. **Never** use `UDashboard*` components.
- Editor: `UEditor` (TipTap 3) block editor, Markdown in/out
- AI: Vercel AI SDK (`ai`, `@ai-sdk/vue`), provider-agnostic incl. Ollama
- MCP: `@nuxtjs/mcp-toolkit` (server), AI SDK MCP client (client)
- Data: book folders of Markdown + frontmatter are the source of truth; SQLite (libSQL + Drizzle, FTS5, sqlite-vec) in `.wrote/` is a rebuildable index
- Validation: Zod (schemas in `shared/`)
- Tests: Vitest + `@nuxt/test-utils`, Playwright for e2e
- Desktop (later): Electron in `desktop/`

## Commands

```bash
pnpm dev          # start app
pnpm lint         # eslint (fix with --fix)
pnpm typecheck    # nuxi typecheck
pnpm test         # vitest (unit + nuxt)
pnpm test:e2e     # playwright
```

Run `lint`, `typecheck` and `test` before every commit. Never commit with failing checks.

## Architecture (layers, top → bottom)

```
app/pages, app/layouts        thin: compose components, no logic
app/components                view only: props in, events out
app/composables               all client logic & state (use*)
────────────── $fetch / SSE ──────────────
server/api                    thin handlers: validate → call service → return
server/tools                  tool definitions (defineWroteTool) shared by assistant + MCP
server/mcp, server/api/chat   adapters exposing tools to MCP clients / the AI SDK
server/services               business logic (pure where possible)
server/storage, server/db     file repository, watcher, indexer, Drizzle
shared/                       Zod schemas, types, pure utils (client + server)
```

Dependencies only point downward. Components never call `$fetch`; API handlers never contain business logic; services never import from `app/`.

## Principles

- **Modular & composable.** Small, single-purpose modules. Prefer composition (composables, small components, higher-order functions) over large files or inheritance.
- **Logic in composables, markup in components.** A `.vue` file with non-trivial logic is a smell: move it into a `use*` composable.
- **Extract generic view components** as soon as markup repeats (twice is enough). Feature components compose generic ones.
- **Pure functions first.** Keep side effects at the edges (I/O in storage/services, DOM in components).
- **Types from schemas.** Define Zod schemas once in `shared/schemas`, infer TS types with `z.infer`. No `any`; `unknown` + narrowing instead.
- **Size limits (guidelines):** components ≤ ~150 lines, composables/services ≤ ~200 lines, functions ≤ ~40 lines. Split before exceeding.
- **Naming:** files `kebab-case.ts` except Vue components (`PascalCase.vue`) and composables (`useThing.ts`). Named exports only (no default exports outside Vue SFCs and Nuxt config files).
- **AI never silently edits.** Any AI/MCP change to book content goes through the suggestion flow and the permission model.
- **Accessibility:** keyboard-first, labelled controls, respect reduced motion.

## Tests

Every change that adds or changes logic ships with tests.

| What | Where | Env |
|---|---|---|
| Pure utils, services, storage, tools | colocated `*.test.ts` | node |
| Composables, components | colocated `*.nuxt.test.ts` | nuxt (`@nuxt/test-utils`) |
| User flows | `test/e2e/*.spec.ts` | Playwright |
| Fixture book | `test/fixtures/sample-book/` | shared |

Details: `.claude/rules/tests.md`.

## Rules per file type

Path-scoped rules in `.claude/rules/` load automatically when working on matching files:

| Rule file | Applies to |
|---|---|
| `vue-components.md` | `app/components/**/*.vue` |
| `pages-layouts.md` | `app/pages/**`, `app/layouts/**`, `app/app.vue` |
| `composables.md` | `app/composables/**` |
| `editor.md` | `app/editor/**`, `app/components/editor/**` |
| `styles-theme.md` | `**/*.css`, `app/app.config.ts` |
| `server-api.md` | `server/api/**`, `server/routes/**`, `server/middleware/**` |
| `server-services.md` | `server/services/**`, `server/storage/**`, `server/utils/**` |
| `tools-mcp-ai.md` | `server/tools/**`, `server/mcp/**`, `server/api/chat*` |
| `database.md` | `server/db/**` |
| `shared.md` | `shared/**` |
| `tests.md` | `**/*.test.ts`, `test/**` |
| `desktop.md` | `desktop/**` |

## Workflow

- Work items live in Plane (`WRO-<n>`). Branch: `wro-<n>-short-slug`. Reference `WRO-<n>` in commit messages and PRs.
- Conventional commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`.
- One sub-issue ≈ one PR. Keep PRs small and focused.
- Update `docs/` when behaviour, the book format, or MCP tools change.
