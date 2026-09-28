import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createMistral } from '@ai-sdk/mistral'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { AiModelOption, AiProviderId } from '#shared/schemas/ai'

export interface ProviderInfo {
  id: AiProviderId
  label: string
  local: boolean
  needsKey: boolean
  /** Environment variable read as a fallback key. */
  envKey?: string
  defaultBaseUrl?: string
  /** Suggested models; any model id the provider accepts can also be entered. */
  models: AiModelOption[]
  /** Suggested embedding models; `null` when the provider has no embedding API. */
  embeddingModels: AiModelOption[] | null
}

export const PROVIDERS: Record<AiProviderId, ProviderInfo> = {
  'anthropic': {
    id: 'anthropic',
    label: 'Anthropic',
    local: false,
    needsKey: true,
    envKey: 'ANTHROPIC_API_KEY',
    models: [
      { id: 'claude-opus-5-5', label: 'Claude Opus 5.5' },
      { id: 'claude-sonnet-5', label: 'Claude Sonnet 5' },
      { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
    ],
    embeddingModels: null,
  },
  'openai': {
    id: 'openai',
    label: 'OpenAI',
    local: false,
    needsKey: true,
    envKey: 'OPENAI_API_KEY',
    models: [{ id: 'gpt-5', label: 'GPT-5' }, { id: 'gpt-5-mini', label: 'GPT-5 mini' }],
    embeddingModels: [{ id: 'text-embedding-3-small', label: 'Text Embedding 3 Small' }, { id: 'text-embedding-3-large', label: 'Text Embedding 3 Large' }],
  },
  'google': {
    id: 'google',
    label: 'Google',
    local: false,
    needsKey: true,
    envKey: 'GOOGLE_GENERATIVE_AI_API_KEY',
    models: [{ id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' }, { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' }],
    embeddingModels: [{ id: 'gemini-embedding-001', label: 'Gemini Embedding' }],
  },
  'mistral': {
    id: 'mistral',
    label: 'Mistral',
    local: false,
    needsKey: true,
    envKey: 'MISTRAL_API_KEY',
    models: [{ id: 'mistral-large-latest', label: 'Mistral Large' }, { id: 'mistral-small-latest', label: 'Mistral Small' }],
    embeddingModels: [{ id: 'mistral-embed', label: 'Mistral Embed' }],
  },
  'openrouter': {
    id: 'openrouter',
    label: 'OpenRouter',
    local: false,
    needsKey: true,
    envKey: 'OPENROUTER_API_KEY',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    models: [{ id: 'anthropic/claude-sonnet-5', label: 'Claude Sonnet 5 (via OpenRouter)' }],
    embeddingModels: [{ id: 'openai/text-embedding-3-small', label: 'Text Embedding 3 Small (via OpenRouter)' }],
  },
  'ollama': {
    id: 'ollama',
    label: 'Ollama',
    local: true,
    needsKey: false,
    defaultBaseUrl: 'http://localhost:11434',
    models: [],
    embeddingModels: [{ id: 'nomic-embed-text', label: 'nomic-embed-text (ollama pull nomic-embed-text)' }],
  },
  'openai-compatible': {
    id: 'openai-compatible',
    label: 'OpenAI-compatible (LM Studio, vLLM, …)',
    local: true,
    needsKey: false,
    defaultBaseUrl: 'http://localhost:1234/v1',
    models: [],
    embeddingModels: [],
  },
}

export interface ProviderRuntimeConfig {
  apiKey?: string
  baseUrl?: string
}

/** Creates an AI SDK provider instance (language and, where supported, embedding models). */
export function createProvider(id: AiProviderId, config: ProviderRuntimeConfig) {
  const baseURL = config.baseUrl ?? PROVIDERS[id].defaultBaseUrl
  switch (id) {
    case 'anthropic': return createAnthropic({ apiKey: config.apiKey, baseURL: config.baseUrl })
    case 'openai': return createOpenAI({ apiKey: config.apiKey, baseURL: config.baseUrl })
    case 'google': return createGoogleGenerativeAI({ apiKey: config.apiKey, baseURL: config.baseUrl })
    case 'mistral': return createMistral({ apiKey: config.apiKey, baseURL: config.baseUrl })
    case 'openrouter': return createOpenAICompatible({ name: 'openrouter', apiKey: config.apiKey, baseURL: baseURL! })
    // Ollama serves an OpenAI-compatible API under /v1, including JSON-schema structured outputs.
    case 'ollama': return createOpenAICompatible({ name: 'ollama', baseURL: `${baseURL!.replace(/\/$/, '')}/v1`, supportsStructuredOutputs: true })
    case 'openai-compatible': return createOpenAICompatible({ name: 'openai-compatible', apiKey: config.apiKey, baseURL: baseURL! })
  }
}
