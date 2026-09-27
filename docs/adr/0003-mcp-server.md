# ADR 0003 – MCP server on the official SDK, generated from the shared tool layer

- Status: accepted
- Date: 2026-09-27
- Work item: WRO-35

## Context

The stack planned `@nuxtjs/mcp-toolkit` for the MCP server. Wrote already defines every tool once
(`defineWroteTool`, shared with the assistant), and needs the same tools over stdio (`wrote mcp`) for desktop clients,
outside of Nuxt.

## Decision

Use `@modelcontextprotocol/sdk` directly:

- `server/mcp/server.ts` builds an `McpServer` from `WROTE_TOOLS` via `toMcpTools` (annotations from permissions,
  optional `bookId` added for book tools). It has no Nuxt dependency.
- HTTP: `server/routes/mcp.ts` serves it statelessly over Streamable HTTP at `/mcp` with a bearer token and localhost
  Host/Origin checks.
- stdio: `cli/wrote.ts`, bundled by esbuild to `dist/cli/wrote.mjs` (`bin: wrote`).

## Consequences

- One tool definition feeds the assistant, HTTP MCP and stdio MCP; no file-per-tool duplication as the toolkit's
  auto-discovered `server/mcp/tools/*.ts` would require.
- We own ~150 lines of glue (transport wiring, auth) instead of a module. Revisit if the toolkit gains programmatic
  registration and stdio support.
