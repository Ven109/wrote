# ADR 0005 – Distribution: npm package from a staged build, Docker image, optional basic auth

- Status: accepted
- Date: 2026-09-28
- Work item: WRO-8

## Context

Wrote should start with one command – `npx wrote ./my-book` or `docker run … ghcr.io/ven109/wrote` – without a
checkout, pnpm or a build. The repo's `package.json` lists the whole Nuxt toolchain as dependencies; publishing it
as is would make `npx` install hundreds of packages. Self-hosters also asked for a simple password.

## Decision

- **npm package staged in `dist/npm`** (`cli/pack.mjs`): the CLI bundle (`dist/cli/wrote.mjs`) and the self-contained
  Nitro build (`.output`, symlinks dereferenced because npm drops them). Its only dependency is `@libsql/client`, so
  npm installs the native libsql binary for the user's platform; the traced copy in `.output` resolves it by walking
  up `node_modules`. The repo's `package.json` stays `private`.
- **One CLI** (`cli/wrote.ts`): `wrote [folder]` starts `.output/server/index.mjs` as a child process for the folder
  (a book folder is served from its parent and opened), picks a free port, waits for `/api/health`, opens the
  browser. `wrote mcp` (ADR 0003) is loaded lazily. The bundle inlines everything but libsql.
- **Docker**: multi-stage on `node:22-bookworm-slim` (glibc, matching libsql's prebuilt binaries), static Pandoc and
  Typst binaries per `TARGETARCH`, non-root `node` user, `/books` volume, `tini`, healthcheck on `/api/health`.
- **Basic auth** (`server/middleware/basic-auth.ts`), on when `WROTE_AUTH_USER` and `WROTE_AUTH_PASSWORD` are set.
  Exceptions: `/api/health`; `/mcp` requests with a bearer token (the MCP route checks it); and in-process requests
  (SSR calling the API through Nitro's local fetch, recognised by having no `net.Socket`), which only occur while
  serving an already authenticated request.

## Consequences

- `npx wrote` downloads ~10 MB plus libsql; no build on the user's machine.
- The Nitro build is platform-neutral except libsql; the smoke test runs the tarball on Linux and macOS to catch
  regressions. Windows is untested.
- Basic auth is one shared account – enough for a personal server, not multi-user auth.
