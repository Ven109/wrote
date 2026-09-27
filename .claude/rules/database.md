---
paths:
  - "server/db/**"
---

# Database (Drizzle + SQLite)

- Schema in `server/db/schema.ts` (split by domain if it grows: `schema/entries.ts`, `schema/chat.ts`). Migrations via drizzle-kit, never edited by hand after merge.
- The DB is a **cache/index**: anything derived from book files must be rebuildable. Only app state that has no file representation (chat threads, activity log, settings, embeddings) is primary in the DB – document which tables are primary.
- FTS5 and sqlite-vec virtual tables are created in migrations with raw SQL wrapped in typed helpers.
- Query helpers live next to the schema, return typed results, and are used by services (not API handlers).
- Tests use an in-memory or temp-file DB.
