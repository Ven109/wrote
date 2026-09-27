# AI providers

Wrote works fully without AI. AI features (assistant, suggestions, summaries) appear once a chat model is configured
in **AI models** (`/settings/ai`).

## Providers

| Provider | Key | Notes |
|---|---|---|
| Anthropic, OpenAI, Google, Mistral | API key | Or the usual env var (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, `MISTRAL_API_KEY`) |
| OpenRouter | API key (`OPENROUTER_API_KEY`) | Any OpenRouter model id, e.g. `openrouter:anthropic/claude-sonnet-5` |
| Ollama | – | Local. Default `http://localhost:11434`; installed models are listed automatically |
| OpenAI-compatible | optional | LM Studio, vLLM, llama.cpp server, proxies. Default `http://localhost:1234/v1` |

Models are referenced as `provider:model` (e.g. `ollama:llama3.2`). Two defaults exist: **chat** (assistant and longer
tasks) and **fast** (summaries, quick suggestions; falls back to chat). A third, optional slot, **embeddings**, turns
on semantic search (see below).

## Where settings live

- `<workspace>/.wrote/ai-settings.json` – providers, base URLs, default models.
- `<workspace>/.wrote/secrets.json` – API keys, readable by your user only (`0600`). Keys are write-only in the UI and
  API: they are never sent to the browser. (The desktop app will move them to the OS keychain.)

## For developers

Features get models only through `getModel(workspaceDir, task)` (`server/ai/models.ts`), which returns `null` when AI
is not configured – handle that by hiding the feature or showing a setup hint. Never hardcode provider or model ids.
Tests use mocked models or a fake OpenAI-compatible server; CI never calls real providers.

## Assistant

The assistant panel (right sidebar, ✦) chats about the open book:

- It uses the **chat** model and the shared tool layer, limited to `read` and `propose` tools: it can search, read
  entries, look at the structure and codex, and *propose* edits, but never changes the manuscript directly.
- Every message carries context: the book and the entry that is open (shown as chips above the prompt), so
  "summarize this scene" needs no names.
- Tool calls are shown in the conversation (collapsible, with links to the entries they returned).
- Threads are stored per book in `.wrote/state.db` and survive restarts; the latest thread is resumed.
- Model output is rendered as sanitized Markdown (DOMPurify); book content and tool results are treated as untrusted
  data in the system prompt.

## Semantic search (embeddings)

With an **embeddings** model set, search finds passages by meaning as well as by words – "scenes where Mara feels
guilty" finds a scene where nobody will look her in the eye.

- Supported: OpenAI (`text-embedding-3-small`), Google (`gemini-embedding-001`), Mistral (`mistral-embed`),
  OpenRouter, OpenAI-compatible servers and **Ollama** (`ollama pull nomic-embed-text`) – fully offline. Anthropic
  has no embedding API.
- Embedding happens in the **background** (job "Update semantic search", visible in the jobs indicator): once for the
  whole book when a model is chosen or a book opens, then after edits – debounced, and only for the passages that
  changed. Writing is never blocked; until the vectors are ready, search is full-text only.
- Entries are split into passages (paragraphs grouped under their heading, `server/search/chunk.ts`). Vectors are
  stored per passage hash in `.wrote/index.db`, so unchanged text is never re-embedded. Switching the model recomputes
  all vectors (vectors of different models are not comparable).
- Results from both searches are fused with reciprocal rank fusion. In ⌘K they appear under "In this book"; matches
  by meaning carry the ✦ icon. The assistant's and MCP's `search` tool use the same hybrid search.
- If the model is unreachable at query time, search silently falls back to full-text.

## Rolling summaries

With **Settings → AI models → Background AI → Keep summaries up to date** switched on (off by default – it sends
your manuscript to the **fast** model), Wrote keeps short summaries of every scene, chapter, part and the whole book,
so the assistant can grasp the story without reading every scene (`get_summaries` tool).

- A scene is summarized again only after a **significant** change: at least 10 % of its word trigrams and about a
  sentence differ (`shared/utils/text-change.ts`) – typo fixes and small edits never cost tokens.
- Chapters, parts and the book are rolled up from their children's summaries whenever those change, so an edit
  cascades upwards in the same run.
- It runs in the background as the job "Update summaries": one minute after you stop editing (unique and debounced),
  when a book opens, and right away when you switch it on.
- A **daily token budget** (default 100,000) caps the cost; once reached, summaries pause until the next day.
- Summaries appear below the editor. **Edit** makes a summary yours: background updates never overwrite it (it still
  feeds the chapter/book summary); **Reset to automatic** hands it back. **Use as synopsis** copies it into the
  entry's `synopsis` frontmatter – only when you click it.
- Summaries and token usage live in `.wrote/state.db` (they are not derived from the files, so they survive index
  rebuilds).
