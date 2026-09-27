import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import { DEFAULT_TOOL_POLICY, ToolPolicySchema, type McpClientView, type McpSettingsView, type ToolPolicy, type ToolPolicyPatch } from '#shared/schemas/permissions'
import { createRecordId } from '#shared/utils/ids'
import { readSettingsFile, readSettingsText, removeSettingsFile, writeSettingsFile } from '../storage/app-settings'
import { NotFoundError } from '../storage/errors'
import { createSerializer } from '../utils/serialize'

const FILE = 'mcp-clients.json'
const LEGACY_TOKEN_FILE = 'mcp-token'
/** Don't rewrite the file on every request just to bump "last used". */
const LAST_USED_RESOLUTION_MS = 60_000

const StoredClientSchema = z.object({
  id: z.string(),
  name: z.string(),
  tokenHash: z.string(),
  tokenPreview: z.string(),
  createdAt: z.string(),
  lastUsedAt: z.string().nullable().default(null),
  policy: ToolPolicySchema.default(DEFAULT_TOOL_POLICY),
})
type StoredClient = z.infer<typeof StoredClientSchema>

const ClientsFileSchema = z.object({
  clients: z.array(StoredClientSchema).default([]),
  assistant: ToolPolicySchema.default(DEFAULT_TOOL_POLICY),
})
type ClientsFile = z.infer<typeof ClientsFileSchema>

const serialized = createSerializer()
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')
const newToken = () => `wrote_${randomBytes(24).toString('hex')}`
const preview = (token: string) => `${token.slice(0, 10)}…`
const toView = ({ tokenHash: _hash, ...client }: StoredClient): McpClientView => client

function newClient(name: string, token: string, policy: ToolPolicy, now: Date): StoredClient {
  return { id: createRecordId('mcp', 10), name, tokenHash: hashToken(token), tokenPreview: preview(token), createdAt: now.toISOString(), lastUsedAt: null, policy }
}

/**
 * Loads the registry. The single token of earlier versions (`.wrote/mcp-token`) becomes a client named
 * "Default client", so agents configured with it keep working; only its hash is kept.
 */
async function load(workspaceDir: string, now = new Date()): Promise<ClientsFile> {
  const file = await readSettingsFile(workspaceDir, FILE, ClientsFileSchema)
  const legacy = await readSettingsText(workspaceDir, LEGACY_TOKEN_FILE)
  if (!legacy) return file
  const migrated = { ...file, clients: [...file.clients, newClient('Default client', legacy, DEFAULT_TOOL_POLICY, now)] }
  await writeSettingsFile(workspaceDir, FILE, migrated, { secret: true })
  await removeSettingsFile(workspaceDir, LEGACY_TOKEN_FILE)
  return migrated
}

function update<T>(workspaceDir: string, change: (file: ClientsFile) => { file: ClientsFile, result: T }): Promise<T> {
  return serialized(workspaceDir, async () => {
    const { file, result } = change(await load(workspaceDir))
    await writeSettingsFile(workspaceDir, FILE, file, { secret: true })
    return result
  })
}

export async function mcpSettingsView(workspaceDir: string, url: string): Promise<McpSettingsView> {
  const file = await serialized(workspaceDir, () => load(workspaceDir))
  return { url, clients: file.clients.map(toView), assistant: file.assistant }
}

/** Creates a client with its own token. The token is returned once; only its hash is stored. */
export function createMcpClient(workspaceDir: string, input: { name: string, policy?: ToolPolicyPatch }, now = new Date()): Promise<{ client: McpClientView, token: string }> {
  const token = newToken()
  return update(workspaceDir, (file) => {
    const client = newClient(input.name, token, { ...DEFAULT_TOOL_POLICY, ...input.policy }, now)
    return { file: { ...file, clients: [...file.clients, client] }, result: { client: toView(client), token } }
  })
}

function withClient(file: ClientsFile, id: string): StoredClient {
  const client = file.clients.find(c => c.id === id)
  if (!client) throw new NotFoundError(`MCP client ${id}`)
  return client
}

export function updateMcpClient(workspaceDir: string, id: string, input: { name?: string, policy?: ToolPolicyPatch }): Promise<McpClientView> {
  return update(workspaceDir, (file) => {
    const current = withClient(file, id)
    const next = { ...current, name: input.name ?? current.name, policy: { ...current.policy, ...input.policy } }
    return { file: { ...file, clients: file.clients.map(c => (c.id === id ? next : c)) }, result: toView(next) }
  })
}

/** Revokes a client: its token stops working immediately. */
export function deleteMcpClient(workspaceDir: string, id: string): Promise<void> {
  return update(workspaceDir, (file) => {
    withClient(file, id)
    return { file: { ...file, clients: file.clients.filter(c => c.id !== id) }, result: undefined }
  })
}

export async function assistantPolicy(workspaceDir: string): Promise<ToolPolicy> {
  return (await serialized(workspaceDir, () => load(workspaceDir))).assistant
}

export function updateAssistantPolicy(workspaceDir: string, patch: ToolPolicyPatch): Promise<ToolPolicy> {
  return update(workspaceDir, (file) => {
    const assistant = { ...file.assistant, ...patch }
    return { file: { ...file, assistant }, result: assistant }
  })
}

const sameHash = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))

/** The client a bearer token belongs to (and bumps its "last used"), or `null` for an unknown token. */
export async function authenticateMcpClient(workspaceDir: string, authorization: string | undefined, now = new Date()): Promise<McpClientView | null> {
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()
  if (!token) return null
  const hash = hashToken(token)
  const file = await serialized(workspaceDir, () => load(workspaceDir))
  const client = file.clients.find(c => sameHash(c.tokenHash, hash))
  if (!client) return null
  const lastUsed = client.lastUsedAt ? Date.parse(client.lastUsedAt) : 0
  if (now.getTime() - lastUsed > LAST_USED_RESOLUTION_MS) {
    await update(workspaceDir, f => ({ file: { ...f, clients: f.clients.map(c => (c.id === client.id ? { ...c, lastUsedAt: now.toISOString() } : c)) }, result: undefined }))
  }
  return toView({ ...client, lastUsedAt: now.toISOString() })
}
