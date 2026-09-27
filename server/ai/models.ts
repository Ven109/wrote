import { generateText, type LanguageModel } from 'ai'
import type { AiModelOption, AiProviderId, AiTask } from '#shared/schemas/ai'
import { loadAiConfig, modelRefFor, parseModelRef, resolveModel, type AiConfig } from '../services/ai-settings'
import { PROVIDERS } from './providers'

/**
 * The single entry point for models: the configured model for a task, or `null` when AI is not set up.
 * Features must handle `null` gracefully (hide AI actions or show a setup hint) – never hardcode models.
 */
export async function getModel(workspaceDir: string, task: AiTask): Promise<LanguageModel | null> {
  const config = await loadAiConfig(workspaceDir)
  return resolveModel(config, modelRefFor(config.settings, task))
}

export interface ConnectionResult {
  ok: boolean
  message: string
  latencyMs: number
}

type Generate = (options: { model: LanguageModel, prompt: string, maxOutputTokens: number, abortSignal: AbortSignal }) => Promise<{ text: string }>

/** Sends a tiny prompt to check that a model answers with the current settings. */
export async function testConnection(config: AiConfig, ref: string, generate: Generate = generateText, timeoutMs = 20_000): Promise<ConnectionResult> {
  const started = Date.now()
  const model = resolveModel(config, ref)
  if (!model) return { ok: false, message: 'Provider is not enabled or has no API key.', latencyMs: 0 }
  try {
    const { text } = await generate({ model, prompt: 'Reply with the single word OK.', maxOutputTokens: 16, abortSignal: AbortSignal.timeout(timeoutMs) })
    return { ok: true, message: text.trim().slice(0, 80) || 'Connected', latencyMs: Date.now() - started }
  }
  catch (error) {
    return { ok: false, message: error instanceof Error ? error.message.slice(0, 300) : 'Connection failed', latencyMs: Date.now() - started }
  }
}

type Fetch = (url: string, init?: { headers?: Record<string, string>, signal?: AbortSignal }) => Promise<{ ok: boolean, json: () => Promise<unknown> }>

async function discover(id: AiProviderId, baseUrl: string, apiKey: string | undefined, fetchFn: Fetch): Promise<AiModelOption[]> {
  const signal = AbortSignal.timeout(3000)
  if (id === 'ollama') {
    const response = await fetchFn(`${baseUrl.replace(/\/$/, '')}/api/tags`, { signal })
    const data = response.ok ? await response.json() as { models?: { name: string }[] } : {}
    return (data.models ?? []).map(model => ({ id: model.name, label: model.name }))
  }
  const response = await fetchFn(`${baseUrl.replace(/\/$/, '')}/models`, { signal, headers: apiKey ? { authorization: `Bearer ${apiKey}` } : {} })
  const data = response.ok ? await response.json() as { data?: { id: string }[] } : {}
  return (data.data ?? []).map(model => ({ id: model.id, label: model.id }))
}

/**
 * Models offered for a provider: the curated list plus, for local/OpenAI-compatible endpoints,
 * the models installed there (unreachable endpoints just return the curated list).
 */
export async function listModels(config: AiConfig, id: AiProviderId, fetchFn: Fetch = fetch): Promise<AiModelOption[]> {
  const info = PROVIDERS[id]
  const baseUrl = config.settings.providers[id]?.baseUrl ?? info.defaultBaseUrl
  if (!baseUrl || !['ollama', 'openai-compatible'].includes(id)) return info.models
  try {
    return [...info.models, ...await discover(id, baseUrl, config.keys[id], fetchFn)]
  }
  catch {
    return info.models
  }
}

export { parseModelRef }
