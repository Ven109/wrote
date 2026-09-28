import { z } from 'zod'
import { SummarySettingsPatchSchema, SummarySettingsSchema } from './summaries'
import { ModelPriceSchema, type ModelPrice } from './usage'

export const AI_PROVIDER_IDS = ['anthropic', 'openai', 'google', 'mistral', 'openrouter', 'ollama', 'openai-compatible'] as const
export const AiProviderIdSchema = z.enum(AI_PROVIDER_IDS)
export type AiProviderId = z.infer<typeof AiProviderIdSchema>

/** Model tiers: `chat` (thorough, the default) and `fast` (cheap and quick, falls back to chat). */
export const AI_TASKS = ['chat', 'fast'] as const
export const AiTaskSchema = z.enum(AI_TASKS)
export type AiTask = z.infer<typeof AiTaskSchema>

/**
 * AI features. Each one uses its tier's model unless the settings route it to its own model
 * (e.g. reviews on a large model, autocomplete on a small local one). Also the `feature` of usage rows.
 */
export const AI_FEATURES = ['assistant', 'autocomplete', 'inline', 'summaries', 'review', 'extraction', 'outline'] as const
export const AiFeatureSchema = z.enum(AI_FEATURES)
export type AiFeature = z.infer<typeof AiFeatureSchema>

/** The tier a feature uses when it has no model of its own. */
export const FEATURE_TIER: Record<AiFeature, AiTask> = {
  assistant: 'chat',
  autocomplete: 'fast',
  inline: 'chat',
  summaries: 'fast',
  review: 'chat',
  extraction: 'chat',
  outline: 'chat',
}

/** What a model is resolved for: a tier or a feature. */
export type AiRoute = AiTask | AiFeature

/** Configurable model slots: the tiers, per-feature overrides and the embedding model (semantic search). */
export const AI_MODEL_SLOTS = [...AI_TASKS, ...AI_FEATURES, 'embedding'] as const
export const AiModelSlotSchema = z.enum(AI_MODEL_SLOTS)
export type AiModelSlot = z.infer<typeof AiModelSlotSchema>

/** What a model list is for: language models (chat/fast) or embedding models. */
export const ModelPurposeSchema = z.enum(['language', 'embedding'])
export type ModelPurpose = z.infer<typeof ModelPurposeSchema>

/** `provider:model`, e.g. `anthropic:claude-sonnet-5` or `ollama:llama3.2`. */
export const ModelRefSchema = z.string().regex(/^[a-z-]+:.+$/, 'Expected "provider:model"')

export const ProviderSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  /** Override for local/self-hosted endpoints (Ollama, LM Studio, proxies). */
  baseUrl: z.url().optional(),
})

/** Non-secret AI settings, stored in the workspace (`.wrote/ai-settings.json`). */
export const AiSettingsSchema = z.object({
  providers: z.partialRecord(AiProviderIdSchema, ProviderSettingsSchema).default({}),
  models: z.partialRecord(AiModelSlotSchema, ModelRefSchema.nullable()).default({}),
  /** Rolling scene/chapter/book summaries (WRO-48), written in the background with the fast model. */
  summaries: SummarySettingsSchema.default({ enabled: false, dailyTokenBudget: 100_000 }),
  /** Ghost-text autocomplete in the editor (fast model). Off by default. */
  autocomplete: z.boolean().default(false),
  /** Share of an accepted AI passage the author must rewrite before it stops counting as AI-assisted. */
  provenanceThreshold: z.number().min(0.1).max(1).default(0.5),
  /** Monthly AI budget in USD (whole workspace); warnings at 80% and 100%. `null`: no budget. */
  monthlyBudget: z.number().positive().max(100_000).nullable().default(null),
  /** Own prices per model (`provider:model`), overriding the built-in estimates. */
  prices: z.record(ModelRefSchema, ModelPriceSchema).default({}),
})
export type AiSettings = z.infer<typeof AiSettingsSchema>

/** Provider patch: omitted fields stay unchanged (no defaults here), `baseUrl: null` resets it. */
export const ProviderPatchSchema = z.object({
  enabled: z.boolean().optional(),
  baseUrl: z.url().nullable().optional(),
})

export const UpdateAiSettingsSchema = z.object({
  providers: z.partialRecord(AiProviderIdSchema, ProviderPatchSchema).optional(),
  models: z.partialRecord(AiModelSlotSchema, ModelRefSchema.nullable()).optional(),
  summaries: SummarySettingsPatchSchema.optional(),
  autocomplete: z.boolean().optional(),
  provenanceThreshold: z.number().min(0.1).max(1).optional(),
  monthlyBudget: z.number().positive().max(100_000).nullable().optional(),
  /** Per model: a price, or `null` to go back to the built-in estimate. */
  prices: z.record(ModelRefSchema, ModelPriceSchema.nullable()).optional(),
  /** Write-only: a new key, or `null` to delete it. Keys are never returned. */
  keys: z.partialRecord(AiProviderIdSchema, z.string().trim().min(1).max(500).nullable()).optional(),
})
export type UpdateAiSettingsInput = z.infer<typeof UpdateAiSettingsSchema>

export const TestConnectionSchema = z.object({ model: ModelRefSchema })

/** What the client sees: never the keys, only whether one is set. */
export interface AiProviderView {
  id: AiProviderId
  label: string
  local: boolean
  needsKey: boolean
  enabled: boolean
  baseUrl: string | null
  defaultBaseUrl: string | null
  hasKey: boolean
  /** Where the key comes from: saved in settings or an environment variable. */
  keySource: 'settings' | 'env' | null
}

export interface AiSettingsView {
  providers: AiProviderView[]
  models: Partial<Record<AiModelSlot, string | null>>
  /** True when a chat model resolves; AI features are hidden or show a setup hint otherwise. */
  configured: boolean
  /** True when an embedding model resolves: semantic search is on. */
  embeddings: boolean
  summaries: z.infer<typeof SummarySettingsSchema>
  autocomplete: boolean
  provenanceThreshold: number
  monthlyBudget: number | null
  prices: Record<string, ModelPrice>
}

export interface AiModelOption {
  id: string
  label: string
}
