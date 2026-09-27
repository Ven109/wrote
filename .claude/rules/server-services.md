---
paths:
  - "server/services/**"
  - "server/storage/**"
  - "server/utils/**"
---

# Services, storage & server utils

- **Services** hold business logic. Export small functions (`createNote`, `moveEntry`, `searchBook`), not classes. Pass dependencies (repo, db, clock) as parameters or a context object so they are testable without Nuxt.
- **Storage** (`server/storage/`) is the only layer that touches the file system: file repository, watcher, indexer. All paths are resolved inside the book root (path-traversal safe), writes are atomic (temp file + rename) and conflict-checked.
- The Markdown folder is the source of truth; the SQLite index must always be rebuildable from it.
- Keep functions pure where possible; isolate I/O at the edges.
- Return typed results; throw typed domain errors (`NotFoundError`, `ConflictError`) that API handlers map to HTTP.
- Colocated `*.test.ts` against `test/fixtures/sample-book` (copied to a temp dir per test). Target ≥ 80% coverage for `server/services` and `server/storage`.
