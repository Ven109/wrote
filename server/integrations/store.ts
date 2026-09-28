import { z } from 'zod'
import { IntegrationSchema, type Integration } from '#shared/schemas/integrations'
import { readSettingsFile, writeSettingsFile } from '../storage/app-settings'

const SETTINGS_FILE = 'integrations.json'
const SECRETS_FILE = 'integration-secrets.json'

const SettingsSchema = z.object({ integrations: z.array(IntegrationSchema).default([]) })

/** Per integration: env and header values, and OAuth state (client registration, tokens, PKCE verifier). */
const SecretsEntrySchema = z.object({
  env: z.record(z.string(), z.string()).default({}),
  headers: z.record(z.string(), z.string()).default({}),
  oauth: z.record(z.string(), z.unknown()).default({}),
})
export type IntegrationSecrets = z.infer<typeof SecretsEntrySchema>
const SecretsSchema = z.object({ integrations: z.record(z.string(), SecretsEntrySchema).default({}) })

export const readIntegrations = async (workspaceDir: string): Promise<Integration[]> => (await readSettingsFile(workspaceDir, SETTINGS_FILE, SettingsSchema)).integrations

export async function writeIntegrations(workspaceDir: string, integrations: Integration[]): Promise<void> {
  await writeSettingsFile(workspaceDir, SETTINGS_FILE, { integrations })
}

export async function readSecrets(workspaceDir: string, id: string): Promise<IntegrationSecrets> {
  const all = await readSettingsFile(workspaceDir, SECRETS_FILE, SecretsSchema)
  return all.integrations[id] ?? SecretsEntrySchema.parse({})
}

/** Serialised read-modify-write of the secrets file (OAuth callbacks and saves may overlap). */
let queue: Promise<unknown> = Promise.resolve()
export function updateSecrets(workspaceDir: string, id: string, update: (current: IntegrationSecrets) => IntegrationSecrets | null): Promise<void> {
  const next = queue.then(async () => {
    const all = await readSettingsFile(workspaceDir, SECRETS_FILE, SecretsSchema)
    const updated = update(all.integrations[id] ?? SecretsEntrySchema.parse({}))
    const integrations = Object.fromEntries(Object.entries({ ...all.integrations, [id]: updated }).filter(([, value]) => value !== null))
    await writeSettingsFile(workspaceDir, SECRETS_FILE, { integrations }, { secret: true })
  })
  queue = next.catch(() => undefined)
  return next
}
