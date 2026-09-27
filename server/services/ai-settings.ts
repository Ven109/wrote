import { z } from 'zod'
import { AI_PROVIDER_IDS, AiSettingsSchema, type AiProviderId, type AiSettings, type AiSettingsView, type AiTask, type UpdateAiSettingsInput } from '#shared/schemas/ai'
import { PROVIDERS, createProvider } from '../ai/providers'
import { readSettingsFile, writeSettingsFile } from '../storage/app-settings'

const SETTINGS_FILE = 'ai-settings.json'
const SECRETS_FILE = 'secrets.json'
const SecretsSchema = z.object({ keys: z.partialRecord(z.enum(AI_PROVIDER_IDS), z.string()).default({}) })

export interface AiConfig {
  settings: AiSettings
  /** Saved keys (never sent to clients). */
  keys: Partial<Record<AiProviderId, string>>
  env: Record<string, string | undefined>
}

export async function loadAiConfig(workspaceDir: string, env: Record<string, string | undefined> = process.env): Promise<AiConfig> {
  const [settings, secrets] = await Promise.all([
    readSettingsFile(workspaceDir, SETTINGS_FILE, AiSettingsSchema),
    readSettingsFile(workspaceDir, SECRETS_FILE, SecretsSchema),
  ])
  return { settings, keys: secrets.keys, env }
}

function keyFor(config: AiConfig, id: AiProviderId): { key?: string, source: 'settings' | 'env' | null } {
  const saved = config.keys[id]
  if (saved) return { key: saved, source: 'settings' }
  const envName = PROVIDERS[id].envKey
  const fromEnv = envName ? config.env[envName] : undefined
  return fromEnv ? { key: fromEnv, source: 'env' } : { source: null }
}

/** Whether a provider can be used: enabled and, if it needs one, has a key. */
export function providerReady(config: AiConfig, id: AiProviderId): boolean {
  return Boolean(config.settings.providers[id]?.enabled) && (!PROVIDERS[id].needsKey || Boolean(keyFor(config, id).key))
}

/** Splits `provider:model` (the model part may contain `:` or `/`). */
export function parseModelRef(ref: string): { provider: AiProviderId, model: string } | null {
  const index = ref.indexOf(':')
  const provider = ref.slice(0, index) as AiProviderId
  const model = ref.slice(index + 1)
  return index > 0 && model && AI_PROVIDER_IDS.includes(provider) ? { provider, model } : null
}

/** Resolves a model reference with the configured provider, or `null` if it cannot be used. */
export function resolveModel(config: AiConfig, ref: string | null | undefined) {
  const parsed = ref ? parseModelRef(ref) : null
  if (!parsed || !providerReady(config, parsed.provider)) return null
  const provider = createProvider(parsed.provider, { apiKey: keyFor(config, parsed.provider).key, baseUrl: config.settings.providers[parsed.provider]?.baseUrl })
  return provider.languageModel(parsed.model)
}

/** The model reference used for a task (`fast` falls back to `chat`). */
export function modelRefFor(settings: AiSettings, task: AiTask): string | null {
  return settings.models[task] ?? (task === 'chat' ? null : settings.models.chat ?? null)
}

export function aiSettingsView(config: AiConfig): AiSettingsView {
  return {
    providers: AI_PROVIDER_IDS.map((id) => {
      const info = PROVIDERS[id]
      const key = keyFor(config, id)
      return {
        id,
        label: info.label,
        local: info.local,
        needsKey: info.needsKey,
        enabled: Boolean(config.settings.providers[id]?.enabled),
        baseUrl: config.settings.providers[id]?.baseUrl ?? null,
        defaultBaseUrl: info.defaultBaseUrl ?? null,
        hasKey: Boolean(key.key),
        keySource: key.source,
      }
    }),
    models: config.settings.models,
    configured: resolveModel(config, modelRefFor(config.settings, 'chat')) !== null,
  }
}

/** Per-workspace write lock: patches are read-merge-write, so concurrent ones must not interleave. */
const writeLocks = new Map<string, Promise<unknown>>()

function serialized<T>(workspaceDir: string, task: () => Promise<T>): Promise<T> {
  const previous = writeLocks.get(workspaceDir) ?? Promise.resolve()
  const next = previous.then(task, task)
  writeLocks.set(workspaceDir, next)
  const release = () => {
    if (writeLocks.get(workspaceDir) === next) writeLocks.delete(workspaceDir)
  }
  next.then(release, release)
  return next
}

/** Merges a settings patch; keys go to the owner-only secrets file and are never echoed back. */
export function updateAiSettings(workspaceDir: string, input: UpdateAiSettingsInput): Promise<AiSettingsView> {
  return serialized(workspaceDir, () => applyAiSettingsPatch(workspaceDir, input))
}

async function applyAiSettingsPatch(workspaceDir: string, input: UpdateAiSettingsInput): Promise<AiSettingsView> {
  const config = await loadAiConfig(workspaceDir)
  const providers = { ...config.settings.providers }
  for (const [id, patch] of Object.entries(input.providers ?? {}) as [AiProviderId, NonNullable<UpdateAiSettingsInput['providers']>[AiProviderId]][]) {
    const current = providers[id] ?? { enabled: false }
    const baseUrl = patch?.baseUrl === null ? undefined : patch?.baseUrl ?? current.baseUrl
    providers[id] = { enabled: patch?.enabled ?? current.enabled, ...(baseUrl ? { baseUrl } : {}) }
  }
  const settings: AiSettings = { providers, models: { ...config.settings.models, ...input.models } }
  await writeSettingsFile(workspaceDir, SETTINGS_FILE, settings)
  if (input.keys) {
    const changes = input.keys
    const kept = Object.entries(config.keys).filter(([id]) => changes[id as AiProviderId] === undefined)
    const added = Object.entries(changes).filter((entry): entry is [string, string] => entry[1] !== null)
    const keys = Object.fromEntries([...kept, ...added])
    await writeSettingsFile(workspaceDir, SECRETS_FILE, { keys }, { secret: true })
  }
  return aiSettingsView(await loadAiConfig(workspaceDir))
}
