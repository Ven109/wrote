---
paths:
  - "server/api/**"
  - "server/routes/**"
  - "server/middleware/**"
---

# Server API handlers

- Handlers are **thin**: validate input → call a service → return a typed result. No business logic, no direct file or DB access.
- Validate everything with Zod from `shared/schemas`: `getValidatedRouterParams`, `getValidatedQuery`, `readValidatedBody`.
- File naming follows Nitro conventions (`books/[bookId]/entries.get.ts`). One method per file.
- Errors: throw `createError({ statusCode, statusMessage, data })` with a stable error code; never leak stack traces or file system paths outside the book.
- Return plain serializable objects; types come from `shared/`.
- Streaming (SSE, AI chat) uses `createEventStream` / AI SDK stream helpers and supports abort.
- Every endpoint has an integration test in `test/api/*.test.ts` (`@nuxt/test-utils/e2e` `setup` + `$fetch`, workspace from `createTestWorkspace()`) for the happy path and validation errors.
