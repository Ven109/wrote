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
