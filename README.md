# Wrote

**An open-source, AI-native workspace for writing books.**

Collect notes, build your story bible, outline, draft and revise — with an AI collaborator that knows your whole book, and an MCP server that lets any AI agent (Claude, Cursor, …) work with it too.

- 📝 Notes, codex (characters, places, lore), research, outline and manuscript in one place
- ✦ AI that proposes — never silently overwrites — with full context of your book
- 🔌 MCP server *and* client: your book is accessible to any agent, and the assistant can use your other tools
- 📁 Your book is a folder of Markdown files — git-friendly, no lock-in
- 🧠 Bring your own model: Anthropic, OpenAI, Google, Mistral, Ollama, …

Built with **Nuxt 4** and **Nuxt UI 4** (zinc + yellow).

> Status: concept stage. See [docs/CONCEPT.md](docs/CONCEPT.md).

## Run it

```bash
npx wrote ./my-book                                        # Node 22+, opens the book in your browser
docker run -v ./books:/books -p 3000:3000 ghcr.io/ven109/wrote   # with Pandoc + Typst for every export
```

Options, basic auth and environment variables: [docs/self-hosting.md](docs/self-hosting.md).

## Development

Requirements: Node 22+, pnpm 10 (`corepack enable`).

```bash
pnpm install      # install dependencies (also sets up git hooks)
pnpm dev          # start the app on http://localhost:3000
pnpm lint         # lint
pnpm typecheck    # type-check
pnpm test         # unit + component tests
```

See [CLAUDE.md](CLAUDE.md) for architecture and conventions.
