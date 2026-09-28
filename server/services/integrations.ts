import type { Integration, IntegrationView, SaveIntegrationInput } from '#shared/schemas/integrations'
import { connection, disconnect, finishSignIn, peekConnection } from '../integrations/manager'
import { pendingAuthUrl, verifyOAuthState } from '../integrations/oauth'
import { readIntegrations, readSecrets, updateSecrets, writeIntegrations } from '../integrations/store'
import { InvalidInputError, NotFoundError } from '../storage/errors'

const CONNECT_TIMEOUT_MS = 15_000

async function view(workspaceDir: string, integration: Integration): Promise<IntegrationView> {
  const live = peekConnection(integration.id)
  const secrets = await readSecrets(workspaceDir, integration.id)
  return {
    ...integration,
    state: integration.enabled ? live?.state ?? 'disconnected' : 'disconnected',
    error: live?.error ?? null,
    authUrl: live?.state === 'needs-auth' ? pendingAuthUrl(integration.id) : null,
    tools: (live?.tools ?? []).map(tool => ({ name: tool.name, title: tool.title, description: tool.description, enabled: !integration.disabledTools.includes(tool.name) })),
    secretsSet: [...Object.keys(secrets.env), ...Object.keys(secrets.headers)],
  }
}

async function find(workspaceDir: string, id: string): Promise<Integration> {
  const integration = (await readIntegrations(workspaceDir)).find(candidate => candidate.id === id)
  if (!integration) throw new NotFoundError(`Integration ${id}`)
  return integration
}

/** Connects (or reconnects) within a time limit; a slow server shows as connecting. */
async function connectWithin(workspaceDir: string, integration: Integration, redirectUrl?: string): Promise<void> {
  await Promise.race([connection(workspaceDir, integration, { redirectUrl, retry: true }), new Promise(resolve => setTimeout(resolve, CONNECT_TIMEOUT_MS))])
}

/** All integrations with their status; `connect` also connects enabled ones that are not connected yet. */
export async function listIntegrations(workspaceDir: string, options: { connect?: boolean, redirectUrl?: string } = {}): Promise<IntegrationView[]> {
  const integrations = await readIntegrations(workspaceDir)
  if (options.connect) {
    await Promise.all(integrations.filter(integration => integration.enabled && !peekConnection(integration.id)?.client).map(integration => connectWithin(workspaceDir, integration, options.redirectUrl)))
  }
  return Promise.all(integrations.map(integration => view(workspaceDir, integration)))
}

/** Creates or updates an integration; secret values are merged (`null` removes one) and never echoed. */
export async function saveIntegration(workspaceDir: string, input: SaveIntegrationInput, options: { create: boolean, redirectUrl?: string }): Promise<IntegrationView> {
  const { env, headers, ...integration } = input
  const all = await readIntegrations(workspaceDir)
  const index = all.findIndex(candidate => candidate.id === integration.id)
  if (options.create && index >= 0) throw new InvalidInputError(`An integration “${integration.id}” already exists`)
  if (!options.create && index < 0) throw new NotFoundError(`Integration ${integration.id}`)
  const merge = (current: Record<string, string>, changes: Record<string, string | null>) => Object.fromEntries(
    Object.entries({ ...current, ...changes }).filter((entry): entry is [string, string] => entry[1] !== null),
  )
  await updateSecrets(workspaceDir, integration.id, secrets => ({ ...secrets, env: merge(secrets.env, env), headers: merge(secrets.headers, headers) }))
  const secrets = await readSecrets(workspaceDir, integration.id)
  const saved: Integration = { ...integration, envKeys: Object.keys(secrets.env), headerKeys: Object.keys(secrets.headers) }
  await writeIntegrations(workspaceDir, index >= 0 ? all.map((candidate, i) => (i === index ? saved : candidate)) : [...all, saved])
  if (saved.enabled) await connectWithin(workspaceDir, saved, options.redirectUrl)
  else await disconnect(saved.id)
  return view(workspaceDir, saved)
}

export async function deleteIntegration(workspaceDir: string, id: string): Promise<void> {
  await find(workspaceDir, id)
  await disconnect(id)
  await writeIntegrations(workspaceDir, (await readIntegrations(workspaceDir)).filter(candidate => candidate.id !== id))
  await updateSecrets(workspaceDir, id, () => null)
}

/** "Connect" / "Test" on the settings page: reconnects and lists the tools again. */
export async function reconnectIntegration(workspaceDir: string, id: string, redirectUrl?: string): Promise<IntegrationView> {
  const integration = await find(workspaceDir, id)
  await disconnect(id)
  await connectWithin(workspaceDir, integration, redirectUrl)
  return view(workspaceDir, integration)
}

export async function setToolEnabled(workspaceDir: string, id: string, tool: string, enabled: boolean): Promise<IntegrationView> {
  const all = await readIntegrations(workspaceDir)
  const integration = await find(workspaceDir, id)
  const disabledTools = enabled ? integration.disabledTools.filter(name => name !== tool) : [...new Set([...integration.disabledTools, tool])]
  const updated = { ...integration, disabledTools }
  await writeIntegrations(workspaceDir, all.map(candidate => (candidate.id === id ? updated : candidate)))
  return view(workspaceDir, updated)
}

/** The OAuth callback: checks the state, exchanges the code and connects. Returns the integration id. */
export async function completeSignIn(workspaceDir: string, input: { code: string, state: string, redirectUrl: string }): Promise<string> {
  const id = await verifyOAuthState(workspaceDir, input.state)
  if (!id) throw new InvalidInputError('This sign-in link is not valid any more – start it again from Integrations')
  await finishSignIn(workspaceDir, await find(workspaceDir, id), input.code, input.redirectUrl)
  return id
}
