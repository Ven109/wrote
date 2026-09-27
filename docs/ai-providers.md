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
tasks) and **fast** (summaries, quick suggestions; falls back to chat).

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
