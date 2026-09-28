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
| `get_outline` | The plot outline: notes, acts and beats with the scenes that tell each beat | read |
| `get_codex` | Characters, places, … | read |
| `timeline_query` | Scenes and events in in-world order with dates, characters and places; filters `character`, `place`, `from`, `to` | read |
| `get_progress` | Word counts and goals | read |
| `list_suggestions` | Edit suggestions with status, author and `stale` (text changed since) | read |
| `list_comments` | Comments on the book or an entry, with replies and `detached` (passage changed) | read |
| `add_comment` | Comments on an exact passage – appears live in the author's editor margin; the text is not changed | propose |
| `create_note` | Adds a note to the inbox | write |
| `extract_codex` | Scans a chapter/scene/part with Wrote's configured model and proposes codex entries (with quotes as evidence) – **never applied directly** | propose |
| `propose_codex_entries` | Proposes codex entries the agent found itself in a chapter/scene/part; entries whose quotes are not in the text are dropped | propose |
| `propose_outline_changes` | Proposes new beats, edits of beats and notes (plot holes, open questions) – **never applied directly**; they appear live as ghost cards on the outline board to accept or reject | propose |
| `suggest_bridge_beats` | Uses Wrote's configured model to propose 2–4 alternative beats between two beats (as outline proposals) | propose |
| `review_outline` | Uses Wrote's configured model to find plot holes, or what is missing in one act (`actId`), optionally against a beat sheet (`templateId`); results are outline proposals | propose |
| `update_outline` | Adds, moves, edits and deletes acts and beats; logged and undoable | write |
| `propose_edit` | Suggests a change (replace a passage, or `mode: "insert_after"` to add paragraphs) – **never applied directly**; it appears live as a tracked change you accept, edit or reject in Wrote | propose |

**Review agent prompts**: every built-in review agent and the custom agents of the open book (`agents/*.md`) are prompts named `review-<id>` (argument `entryId`: a scene or chapter). They embed the scenes and the agent's instructions; findings come back as anchored comments (`add_comment`) and fixes as suggestions (`propose_edit`).

**Resources** (read level; listable, Markdown):

| URI | Content |
|---|---|
| `wrote://book/{bookId}/outline` | Outline notes, whole-book summary, parts → chapters → scenes with summaries |
| `wrote://book/{bookId}/style-guide` | The style guide |
| `wrote://book/{bookId}/scene/{sceneId}` | A scene with status, POV, location, synopsis |
| `wrote://book/{bookId}/codex/{codexType}/{entryId}` | A codex entry with aliases and fields |

**Prompts** (pick them in your client, e.g. `/` in Claude Code): `continue-scene` (sceneId, direction?),
`critique-chapter` (chapterId, focus?), `brainstorm-titles` (count?), `character-interview` (character),
`summarize-book`. They embed the relevant resources and ask the agent to answer through reviewable tools
(`propose_edit`, `add_comment`, notes).

Tools that work on a book take an optional `bookId` (from `list_books`). It can be omitted when you have only one
book, or when the server was started for a book (`wrote mcp --book …`).

## Option 1: HTTP (Claude Code, Cursor, MCP Inspector)

While Wrote runs, the endpoint is `http://localhost:3000/mcp` (Streamable HTTP). Open **Connect agents** in the
sidebar, give the agent a name (e.g. "Claude Code") and create a token. Each agent gets **its own token** and
permissions; the token is shown **once** together with ready-made configs, so copy it right away.

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

From a checkout of this repository, build the CLI with `pnpm build:cli` and use
`"command": "node", "args": ["/path/to/wrote/dist/cli/wrote.mjs", "mcp", "--book", "…"]`.
`--workspace <dir>` serves all books of a folder instead. (`npx wrote ./my-book` without `mcp` starts the app itself,
see [self-hosting.md](self-hosting.md).)

## Permissions

Every tool has a permission level. Each connected agent – and the built-in assistant – has a policy that decides per
level whether a call is **allowed**, **asks you** first, or is **denied** (denied tools are not even offered):

| Level | Tools | Default | Options |
|---|---|---|---|
| read | reading, search, structure | allow | allow, deny |
| propose | `propose_edit` (suggestions you review) | allow | allow, deny |
| write | `create_note` | ask | allow, ask, deny |
| destructive | deleting or overwriting content (future tools) | ask | ask, deny |

Change the policies in **Connect agents**. When a call needs approval, Wrote shows a card with the agent, the tool and
its input (destructive calls open a blocking dialog). The agent waits for your answer; declining or not answering within
two minutes counts as "no" and the agent gets an error saying so.

Approvals need the running Wrote app: over **stdio** (`wrote mcp`) nobody can approve, so tools that would ask are
refused with an explanation.

## Activity & undo

Every tool call that can change data (propose, write, destructive) by the assistant or an agent is logged in the
book's **Activity** page: who, which tool, when, its input and the files it changed with their content before and
after. Filter by who, tool and time, open a diff, and **Undo** any change in one click – the files are restored to
their before-state and the undo itself is logged. If a file was edited after the change, Wrote asks before
discarding those edits. Proposals (`propose_edit`) change no files; resolve them as suggestions instead. The log lives
in `.wrote/state.db` of the book.

## Security

- The HTTP endpoint only answers on **localhost** (requests with another `Host` or a foreign browser `Origin` are
  rejected – DNS-rebinding safe) and requires the **bearer token**. With [basic auth](self-hosting.md#basic-auth)
  on, requests carrying a bearer token skip basic auth; all others to `/mcp` need the basic-auth password.
- Tokens and policies live in `<workspace>/.wrote/mcp-clients.json` (readable by your user only). Only a hash of each
  token is stored. **Revoke** an agent in **Connect agents** and its token stops working immediately; create a new one
  to rotate.
- A token from earlier versions (`.wrote/mcp-token`) is migrated to an agent named "Default client" and keeps working.
- Book content returned to agents is marked as untrusted data in the server instructions. Agents cannot change the
  manuscript directly: `propose_edit` creates a suggestion you review.

## Example prompts

- "Which scenes of my book mention the harbor?"
- "Read the scene *Arrival* and add a note to my inbox with three ideas to raise the tension."
- "Suggest a tighter first sentence for *Arrival*." (creates a suggestion)
- Use the `critique-chapter` prompt: the critique arrives as comments in the margin, live.
- "Read chapter 2 and propose codex entries for its characters and places." (creates codex proposals)

## Troubleshooting

| Symptom | Fix |
|---|---|
| `401 Missing or invalid MCP token` | The token was revoked or mistyped: create a new one in **Connect agents** |
| "… is not allowed …" | The agent's policy denies that level: change it in **Connect agents** |
| "… needs the author's approval …" | Approvals only work over HTTP with Wrote running; use HTTP or allow the level |
| `403 MCP is only available on localhost` | Use `http://localhost:…` or `http://127.0.0.1:…`, not a LAN IP or hostname |
| "Several books exist: pass bookId" | Call `list_books` and pass `bookId`, or start stdio with `--book` |
| Claude Desktop shows no tools | Check the book path; run the command in a terminal – errors are printed to stderr |
