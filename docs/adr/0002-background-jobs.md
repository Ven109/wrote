# ADR 0002 – Background jobs: persistent queue with pub/sub progress

- Status: accepted
- Date: 2026-09-27
- Work item: WRO-369

## Context

AI workflows (book-wide analysis, embeddings, scene summaries), interview transcription and maintenance
(re-indexing) can take minutes. They must not run inside an HTTP request, must survive a server or app
restart, report progress to the UI, and be cancellable. Wrote is local-first and will ship as an Electron app,
so it cannot depend on an external broker (Redis, a cloud queue).

## Decision

- **Persistence:** jobs live in the book's `.wrote/state.db` (the primary-state database with append-only
  migrations, see `server/db/state/`). A row holds kind, status (`queued → running → succeeded | failed |
  cancelled`), input, result, error, progress, attempts and `run_after`.
- **Worker:** one in-process runner per open book (`server/services/jobs.ts`). It claims due jobs atomically
  (`UPDATE … RETURNING`), respects a per-kind concurrency limit, passes an `AbortSignal` for cancellation,
  and retries failures with exponential backoff up to `maxAttempts`. On start it re-queues jobs left `running`
  by a crash or shutdown; on shutdown it aborts running jobs without marking them cancelled, so they resume.
- **Unique & scheduled jobs:** `enqueue(kind, input, { unique, delayMs })`. `unique` returns an already *queued* job of
  the same kind and input instead of adding one (a running one does not count, so a change during a run still gets a
  follow-up run); `delayMs` sets `run_after` for debouncing (like Oban's `unique` and `schedule_in`). Joining a queued
  job never delays it, but a more urgent request moves it forward.
- **Definitions:** `defineWroteJob({ kind, title, input (Zod), concurrency, maxAttempts, run })` in
  `server/jobs/`, registered in `WROTE_JOBS`. `run` gets the input, the book context, the signal and
  `progress(value, message)`.
- **Pub/sub:** every job change is published on the in-process book event bus and streamed to clients over
  the existing SSE endpoint as `event: job`. The client writes updates straight into the Pinia Colada jobs
  cache (`useBookSync`), so progress is live without polling.
- **API:** `GET/POST /api/books/:bookId/jobs`, `POST …/jobs/:jobId/cancel`. Enqueueing returns 202 with the
  queued job.

## Consequences

- No extra infrastructure; the same code runs in the Nuxt server and inside Electron.
- Jobs are per book. Cross-book jobs, if ever needed, get their own workspace-level queue.
- A single process owns a book's queue. Running two servers on the same book folder is unsupported (as it
  already is for the index).
- Tools (assistant/MCP) can enqueue jobs through the runner; exposing job status as MCP tools follows with the
  MCP work (WRO-35).
