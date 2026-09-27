---
paths:
  - "server/db/**"
---

# Database (libSQL + Drizzle)

- **Two databases per book, both in `.wrote/`:**
  - `index.db` – **derived cache** (entries, tags, links, names, FTS5, chunks and their vectors). Rebuildable from the Markdown files. No migrations: bump `INDEX_SCHEMA_VERSION` in `server/db/client.ts` and the index is dropped and rebuilt on open. Keep the raw DDL in `client.ts` and the Drizzle table definitions in `schema.ts` in sync.
  - `state.db` – **primary app state** that has no file representation (jobs, chat threads, summaries, AI token usage, activity log, settings). It has real, append-only migrations in `server/db/state/migrations.ts` (never edit a shipped one – append) and is never dropped. Query helpers live next to it (`server/db/state/jobs.ts`).
- Drizzle for typed queries; raw SQL (`db.$client.execute`) only for FTS5/vector features, always parameterized – never interpolate user input.
- Query helpers live in `server/db/queries.ts` (split by domain when it grows), return typed plain objects and are used by services/tools, not API handlers directly unless trivial.
- The indexer (`server/db/indexer.ts`) is the only writer of entry-derived rows (incl. `chunks`). It must stay equivalent to a full rebuild (there is a test for this). The one other writer is the background `embed` job, which only adds/prunes rows in `embeddings` (keyed by chunk hash) via `server/db/vectors.ts`.
- Vectors use libSQL's native vector functions (`vector_distance_cos` over Float32 blobs) – no extension to load (ADR 0004).
- Tests use `openIndexDb(':memory:')` or a temp copy of the fixture book.
