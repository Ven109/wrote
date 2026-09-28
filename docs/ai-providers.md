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

## Per-feature models

Under *Per-feature models* each AI feature can use its own model; unset features use their tier:

| Feature | Tier | Typical choice |
|---|---|---|
| Assistant (`assistant`) | chat | a strong general model |
| Autocomplete (`autocomplete`) | fast | a small, fast (local) model |
| Inline actions (`inline`) | chat | |
| Summaries (`summaries`) | fast | a cheap model |
| Reviews (`review`) | chat | a large model – it finds more |
| Codex scan (`extraction`) | chat | |
| Outline helpers (`outline`) | chat | |

Review agents set to the *fast* tier keep using the fast model. All model calls resolve through this routing
(`getModel(workspaceDir, route)` in `server/ai/models.ts`).

## Usage, cost and budget

Every AI call (and every embedding batch) is logged in `<workspace>/.wrote/usage.db` with its book, feature, model,
input/output/cached tokens and an **estimated** cost. Costs use built-in list prices (`server/ai/pricing.ts`) – local
Ollama models are free, unknown models have no cost. Set your own prices per model with `prices` in
`ai-settings.json` (USD per million tokens: `{ "input": 3, "output": 15, "cachedInput": 0.3 }`).

The **Usage** page (sidebar → Usage) shows tokens and cost by feature, model, book and month. With a **monthly
budget** (USD, whole workspace) Wrote warns with a toast when a call pushes the month over 80% and 100%; AI keeps
working – the budget is a warning, not a limit.

## Prompt caching

Requests put the stable part first (instructions and book context in the system prompt, the question last).
Anthropic models get a cache breakpoint at the end of the system prompt, so repeated requests on the same material
(review runs, chat turns) read it from the cache; OpenAI and Gemini cache stable prefixes automatically. Cached input
tokens appear as *Cached input* on the Usage page and are billed at the cached rate.

## Where settings live

- `<workspace>/.wrote/ai-settings.json` – providers, base URLs, models per tier and feature, budget, own prices.
- `<workspace>/.wrote/usage.db` – the AI usage log.
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

## Context engine and the context drawer

Every AI request that answers you with book content builds its prompt with the context engine
(`server/ai/context/`), in four layers:

| Layer | What |
|---|---|
| Always included | the style guide, the open entry's synopsis, items you pinned |
| What you are working on | your selection and the open entry (a window around the selection when long) |
| Found for this question | codex entries named in the text or question (titles and aliases), search hits for the question |
| Summaries | the book summary, the open entry's chapter/part and neighbouring scenes |

The items are fitted into a **token budget per model** (about a third of the model's context window, at most 24k
tokens; unknown local models are assumed to have 8k). Under pressure, search hits and neighbouring summaries go
first, then codex entries and the book summary; the selection, open entry and pinned items are kept longest.

Each answer stores a **snapshot** of exactly the prompt it was generated from (`.wrote/state.db`, kept 90 days).
The **Context** button under an answer opens the drawer: every item by layer with its token count, what was left
out and why, and the full prompt. Pin an item to always include it, leave items out, and **Answer again with these
changes**; your choices stay active for the book until you clear them (chip above the prompt).

For developers: build prompts with `buildContext()` + `renderContext()` and save a snapshot; a test fails when a
server file calls a model without it (`server/ai/context/no-bypass.test.ts` lists the justified exceptions, such as
background summaries). Book content is wrapped as untrusted reference material with its tags escaped.

## Suggestions (tracked changes)

AI never changes your text on its own. The assistant and connected MCP clients can only **propose** edits
(`propose_edit`); you decide.

- A suggestion either replaces a passage or adds new paragraph(s) after one. It is anchored on the exact text it
  refers to plus the text around it, so it stays attached while you edit elsewhere; if the passage itself changes,
  it is marked **Text changed** (stale) and can only be rejected.
- In the editor, the original is struck through and the proposal highlighted, with **✓ accept**, **✕ reject** and
  **✎ edit** next to it. New suggestions appear live, even from an agent working over MCP.
- The **✦ n** button above the text opens the list of the entry's suggestions: who proposed it and why, jump to it,
  edit the proposal before accepting, **Accept all** / **Reject all**.
- Accepting applies the text as a normal edit: undo with ⌘Z, saved by autosave. The decision (and your edited
  text, if any) is recorded in `.wrote/state.db`.

## Inline AI actions and autocomplete

Select text (or use a block's menu) and pick **✦ AI**: *Continue writing*, *Rephrase*, *Expand*, *Tighten*,
*Show, don't tell*, *Change tone* (warmer, darker, more tense, …), *Translate*, or *Ask AI…* with your own
instruction.

- Available from the bubble toolbar (selection), the block menu (drag handle / ⋯ on phones), the ✦ button of the
  mobile toolbar and the `/` menu (*Continue writing*, *Rephrase*, *Tighten*, *Expand*, *Ask AI…* for the block at
  the cursor; on an empty line, *Continue writing* continues the paragraph above).
- The answer streams in as a live preview (with **Stop**) and then arrives as a **suggestion** – struck original and
  highlighted proposal, or a new block for *Continue* – that you accept, edit or reject. Nothing is inserted directly.
- Every action builds its prompt with the context engine (style guide, the scene, codex entries named in the passage,
  summaries), uses the **chat** model and stores a context snapshot.
- **Autocomplete** (Settings → AI models → *Autocomplete while writing*, off by default): after a short pause at the end
  of a paragraph, the **fast** model suggests the rest of the sentence as grey ghost text. **Tab** accepts, **Esc** or
  typing dismisses it. When it is off, the editor makes no requests at all.

## Provenance: which text is AI-assisted

When you accept an AI suggestion (from the assistant, an inline action or an MCP client), Wrote remembers that the
accepted passage was AI-written – in a sidecar file, `.wrote/provenance/<entry id>.json`, never in your prose.

- **Highlight AI-assisted text** (the highlighter button above the editor) shows those passages with a subtle
  underline; hover for who wrote it, the model and the date.
- The **word count** popover shows the AI-assisted share of the scene, its chapter and the book.
- Passages are found again by their text and surroundings, so provenance survives reloads and edits elsewhere –
  also edits made in another editor.
- Rewrite a passage yourself and it stops counting as AI-assisted once more than half of its words changed
  (`provenanceThreshold` in `.wrote/ai-settings.json`, 0.1–1, default 0.5).
