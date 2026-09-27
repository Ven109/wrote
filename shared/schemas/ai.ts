import { z } from 'zod'

export const AI_PROVIDER_IDS = ['anthropic', 'openai', 'google', 'mistral', 'openrouter', 'ollama', 'openai-compatible'] as const
export const AiProviderIdSchema = z.enum(AI_PROVIDER_IDS)
export type AiProviderId = z.infer<typeof AiProviderIdSchema>

/** What a model is used for; each task has its own default model. */
export const AI_TASKS = ['chat', 'fast'] as const
export const AiTaskSchema = z.enum(AI_TASKS)
export type AiTask = z.infer<typeof AiTaskSchema>

/** Configurable model slots: the language-model tasks plus the embedding model (semantic search). */
export const AI_MODEL_SLOTS = [...AI_TASKS, 'embedding'] as const
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
}

export interface AiModelOption {
  id: string
  label: string
}
