---
paths:
  - "server/db/**"
---

# Database (libSQL + Drizzle)

- **Two databases per book, both in `.wrote/`:**
  - `index.db` – **derived cache** (entries, tags, links, names, FTS5, later vectors). Rebuildable from the Markdown files. No migrations: bump `INDEX_SCHEMA_VERSION` in `server/db/client.ts` and the index is dropped and rebuilt on open. Keep the raw DDL in `client.ts` and the Drizzle table definitions in `schema.ts` in sync.
  - `state.db` – **primary app state** that has no file representation (chat threads, activity log, settings). Introduced when first needed; it gets real, append-only migrations and is never dropped.
- Drizzle for typed queries; raw SQL (`db.$client.execute`) only for FTS5/vector features, always parameterized – never interpolate user input.
- Query helpers live in `server/db/queries.ts` (split by domain when it grows), return typed plain objects and are used by services/tools, not API handlers directly unless trivial.
- The indexer (`server/db/indexer.ts`) is the only writer of `index.db`. It must stay equivalent to a full rebuild (there is a test for this).
- Tests use `openIndexDb(':memory:')` or a temp copy of the fixture book.
