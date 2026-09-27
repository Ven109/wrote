# Connect agents via MCP

Wrote exposes your books to AI agents (Claude Code, Claude Desktop, Cursor, MCP Inspector, …) through the
[Model Context Protocol](https://modelcontextprotocol.io). Agents use the same tools as the built-in assistant.

| Tool | What it does | Permission |
|---|---|---|
| `list_books` | Lists your books | read |
| `search` | Full-text search in a book | read |
| `read_entry` | Reads a scene, note, codex or research entry (paginated) | read |
| `get_structure` | Parts, chapters, scenes with word counts | read |
| `get_summaries` | Whole-book summary and outline with chapter/part (optionally scene) summaries | read |
| `get_codex` | Characters, places, … | read |
| `get_progress` | Word counts and goals | read |
| `list_suggestions` | Edit suggestions with status, author and `stale` (text changed since) | read |
| `create_note` | Adds a note to the inbox | write |
| `propose_edit` | Suggests a change (replace a passage, or `mode: "insert_after"` to add paragraphs) – **never applied directly**; it appears live as a tracked change you accept, edit or reject in Wrote | propose |

Tools that work on a book take an optional `bookId` (from `list_books`). It can be omitted when you have only one
book, or when the server was started for a book (`wrote mcp --book …`).

## Option 1: HTTP (Claude Code, Cursor, MCP Inspector)

While Wrote runs, the endpoint is `http://localhost:3000/mcp` (Streamable HTTP). Open **Connect agents** in the
sidebar to copy the endpoint, your token and ready-made configs.

**Claude Code**

```bash
claude mcp add --transport http wrote http://localhost:3000/mcp --header "Authorization: Bearer <token>"
```

**Cursor** – `~/.cursor/mcp.json`:

```json
{ "mcpServers": { "wrote": { "url": "http://localhost:3000/mcp", "headers": { "Authorization": "Bearer <token>" } } } }
```

**MCP Inspector**: `npx @modelcontextprotocol/inspector`, transport *Streamable HTTP*, URL as above, add the header
`Authorization: Bearer <token>`.

## Option 2: stdio (Claude Desktop and other local apps)

Runs without the Wrote app, directly on a book folder:

```json
{
  "mcpServers": {
    "wrote": { "command": "npx", "args": ["wrote", "mcp", "--book", "/Users/me/Wrote/my-novel"] }
  }
}
```

`npx wrote` works once Wrote is published as a package. Until then, from a checkout of this repository, build the CLI
with `pnpm build:cli` and use `"command": "node", "args": ["/path/to/wrote/dist/cli/wrote.mjs", "mcp", "--book", "…"]`.
`--workspace <dir>` serves all books of a folder instead.

## Security

- The HTTP endpoint only answers on **localhost** (requests with another `Host` or a foreign browser `Origin` are
  rejected – DNS-rebinding safe) and requires the **bearer token**.
- The token is created on first use in `<workspace>/.wrote/mcp-token` (readable by your user only). Delete the file to
  rotate it; reconnect your clients afterwards.
- Book content returned to agents is marked as untrusted data in the server instructions. Agents cannot change the
  manuscript directly: `propose_edit` creates a suggestion you review.

## Example prompts

- "Which scenes of my book mention the harbor?"
- "Read the scene *Arrival* and add a note to my inbox with three ideas to raise the tension."
- "Suggest a tighter first sentence for *Arrival*." (creates a suggestion)

## Troubleshooting

| Symptom | Fix |
|---|---|
| `401 Missing or invalid MCP token` | Copy the current token from **Connect agents**; it changes when `.wrote/mcp-token` is deleted |
| `403 MCP is only available on localhost` | Use `http://localhost:…` or `http://127.0.0.1:…`, not a LAN IP or hostname |
| "Several books exist: pass bookId" | Call `list_books` and pass `bookId`, or start stdio with `--book` |
| Claude Desktop shows no tools | Check the book path; run the command in a terminal – errors are printed to stderr |
