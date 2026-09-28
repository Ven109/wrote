import { generateText, wrapLanguageModel, type EmbeddingModel, type LanguageModel, type LanguageModelMiddleware } from 'ai'
import type { AiModelOption, AiProviderId, AiRoute, AiTask, ModelPurpose } from '#shared/schemas/ai'
import { loadAiConfig, modelRefFor, parseModelRef, resolveEmbeddingModel, resolveModel, type AiConfig } from '../services/ai-settings'
import { recordAiCall, type UsageScope } from '../services/usage'
import { PROVIDERS } from './providers'
import { promptCacheMiddleware, supportsExplicitCache, usageMiddleware } from './usage-middleware'

/** Who a model call is for: the book and the feature its usage is logged under (default: the route). */
export type ModelScope = Partial<UsageScope>

/** The resolved model wrapped with usage logging (tokens + estimated cost) and, where needed, prompt caching. */
function tracked(workspaceDir: string, model: LanguageModel, ref: string, route: AiRoute, scope: ModelScope): LanguageModel {
  if (typeof model === 'string') return model
  const usage = { bookId: scope.bookId ?? null, feature: scope.feature ?? route }
  const middleware: LanguageModelMiddleware[] = [usageMiddleware(tokens => recordAiCall(workspaceDir, usage, ref, tokens).then(() => undefined))]
  if (supportsExplicitCache(ref)) middleware.push(promptCacheMiddleware)
  return wrapLanguageModel({ model, middleware })
}

/**
 * The single entry point for models: the configured model for a tier or feature (see `modelRefFor`), or `null` when AI is not set up.
 * Features must handle `null` gracefully (hide AI actions or show a setup hint) – never hardcode models.
 */
export async function getModel(workspaceDir: string, route: AiRoute, scope: ModelScope = {}): Promise<LanguageModel | null> {
  return (await getModelWithRef(workspaceDir, route, scope))?.model ?? null
}

/** Review agents asking for the fast tier get it; all others use the `review` route (its own model, else chat). */
export const reviewRoute = (task: AiTask): AiRoute => (task === 'fast' ? 'fast' : 'review')

/** Like `getModel`, plus the `provider:model` reference (context budgets, snapshots). */
export async function getModelWithRef(workspaceDir: string, route: AiRoute, scope: ModelScope = {}): Promise<{ model: LanguageModel, ref: string } | null> {
  const config = await loadAiConfig(workspaceDir)
  const ref = modelRefFor(config.settings, route)
  const model = resolveModel(config, ref)
  return model && ref ? { model: tracked(workspaceDir, model, ref, route, scope), ref } : null
}

export interface ConfiguredEmbeddingModel {
  model: EmbeddingModel
  /** `provider:model` – stored with the vectors, which are only comparable within one model. */
  ref: string
}

/** The configured embedding model (semantic search), or `null` when none is set up. */
export async function getEmbeddingModel(workspaceDir: string): Promise<ConfiguredEmbeddingModel | null> {
  const config = await loadAiConfig(workspaceDir)
  const ref = config.settings.models.embedding
  const model = resolveEmbeddingModel(config, ref)
  return model && ref ? { model, ref } : null
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
 * Models offered for a provider and purpose: the curated list plus, for local/OpenAI-compatible
 * endpoints, the models installed there (unreachable endpoints just return the curated list).
 */
export async function listModels(config: AiConfig, id: AiProviderId, fetchFn: Fetch = fetch, purpose: ModelPurpose = 'language'): Promise<AiModelOption[]> {
  const info = PROVIDERS[id]
  const curated = purpose === 'embedding' ? info.embeddingModels : info.models
  if (!curated) return []
  const baseUrl = config.settings.providers[id]?.baseUrl ?? info.defaultBaseUrl
  if (!baseUrl || !['ollama', 'openai-compatible'].includes(id)) return curated
  try {
    const known = new Set(curated.map(model => model.id))
    return [...curated, ...(await discover(id, baseUrl, config.keys[id], fetchFn)).filter(model => !known.has(model.id))]
  }
  catch {
    return curated
  }
}

export { parseModelRef }
