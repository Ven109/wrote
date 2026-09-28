import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import type { Integration, IntegrationState } from '#shared/schemas/integrations'
import { clearPendingAuth, integrationAuthProvider, pendingAuthUrl, storedRedirectUrl } from './oauth'
import { readSecrets } from './store'

export interface ExternalTool {
  name: string
  title: string
  description: string
  inputSchema: Record<string, unknown>
}

interface Connection {
  key: string
  client: Client | null
  state: IntegrationState
  error: string | null
  tools: ExternalTool[]
  connecting: Promise<Connection> | null
  /** Set while we close on purpose, so a stdio exit is not treated as a crash. */
  closing: boolean
  crashes: number
}

const MAX_RESTARTS = 3
const connections = new Map<string, Connection>()
/** Everything that changes how to connect; a saved change reconnects. */
const keyOf = (integration: Integration) => JSON.stringify([integration.transport, integration.url, integration.command, integration.args, integration.envKeys, integration.headerKeys, integration.enabled])

async function transportFor(workspaceDir: string, integration: Integration, redirectUrl: string | undefined): Promise<Transport> {
  const secrets = await readSecrets(workspaceDir, integration.id)
  if (integration.transport === 'stdio') {
    return new StdioClientTransport({ command: integration.command!, args: integration.args, env: { ...defaultEnvironment(), ...secrets.env }, stderr: 'ignore' })
  }
  // OAuth needs the app's callback URL; connections started by the assistant reuse the one stored at sign-in.
  const callback = redirectUrl ?? await storedRedirectUrl(workspaceDir, integration.id)
  return new StreamableHTTPClientTransport(new URL(integration.url!), {
    requestInit: { headers: secrets.headers },
    authProvider: callback ? integrationAuthProvider(workspaceDir, integration, callback) : undefined,
  })
}

/** PATH and friends for spawned servers (`npx …` must resolve), without the app's own secrets. */
function defaultEnvironment(): Record<string, string> {
  const keep = ['PATH', 'HOME', 'USER', 'LANG', 'TMPDIR', 'TEMP', 'TMP', 'SystemRoot', 'APPDATA', 'LOCALAPPDATA', 'ProgramFiles', 'NODE_EXTRA_CA_CERTS', 'HTTPS_PROXY', 'HTTP_PROXY', 'NO_PROXY']
  return Object.fromEntries(keep.flatMap(key => (process.env[key] ? [[key, process.env[key]!]] : [])))
}

async function open(workspaceDir: string, integration: Integration, connection: Connection, redirectUrl?: string): Promise<Connection> {
  connection.state = 'connecting'
  clearPendingAuth(integration.id)
  const client = new Client({ name: 'wrote', version: '0.1.0' })
  try {
    const transport = await transportFor(workspaceDir, integration, redirectUrl)
    transport.onclose = () => {
      if (connection.client !== client || connection.closing) return
      // A local server that exits on its own crashed: start it again on next use (a few times at most).
      connection.client = null
      connection.crashes++
      connection.state = connection.crashes > MAX_RESTARTS ? 'error' : 'disconnected'
      connection.error = connection.crashes > MAX_RESTARTS ? 'The server keeps stopping – check its command and settings.' : 'The server stopped; it restarts when next used.'
    }
    await client.connect(transport)
    const { tools } = await client.listTools()
    Object.assign(connection, { client, state: 'connected', error: null, tools: tools.map(tool => ({ name: tool.name, title: tool.title ?? tool.annotations?.title ?? tool.name, description: tool.description ?? '', inputSchema: tool.inputSchema as Record<string, unknown> })) })
  }
  catch (error) {
    await client.close().catch(() => {})
    const needsAuth = error instanceof UnauthorizedError || pendingAuthUrl(integration.id) !== null
    Object.assign(connection, { client: null, state: needsAuth ? 'needs-auth' : 'error', error: needsAuth ? 'Sign in to connect this server.' : errorMessage(error), tools: [] })
  }
  finally {
    connection.connecting = null
  }
  return connection
}

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error)).slice(0, 500)

/**
 * The live connection to an integration: connects on first use (and after a settings change or a crash),
 * otherwise reuses the open client. Disabled integrations are not connected.
 */
export async function connection(workspaceDir: string, integration: Integration, options: { redirectUrl?: string, retry?: boolean } = {}): Promise<Connection> {
  const key = keyOf(integration)
  let current = connections.get(integration.id)
  if (current && current.key !== key) {
    await disconnect(integration.id)
    current = undefined
  }
  if (!current) {
    current = { key, client: null, state: 'disconnected', error: null, tools: [], connecting: null, closing: false, crashes: 0 }
    connections.set(integration.id, current)
  }
  if (!integration.enabled) return current
  if (current.connecting) return current.connecting
  if (current.client) return current
  if (current.state === 'error' && current.crashes > MAX_RESTARTS && !options.retry) return current
  if (options.retry) current.crashes = 0
  current.connecting = open(workspaceDir, integration, current, options.redirectUrl)
  return current.connecting
}

/** The connection as it is now, without connecting. */
export const peekConnection = (id: string) => connections.get(id) ?? null

export async function callExternalTool(workspaceDir: string, integration: Integration, name: string, args: Record<string, unknown>, signal?: AbortSignal): Promise<unknown> {
  const live = await connection(workspaceDir, integration)
  if (!live.client) throw new Error(`${integration.name} is not connected: ${live.error ?? live.state}`)
  const result = await live.client.callTool({ name, arguments: args }, undefined, { signal })
  return result
}

export async function disconnect(id: string): Promise<void> {
  const current = connections.get(id)
  if (!current) return
  connections.delete(id)
  current.closing = true
  await current.client?.close().catch(() => {})
}

/** Stops every server (app shutdown). */
export async function disconnectAll(): Promise<void> {
  await Promise.all([...connections.keys()].map(disconnect))
}

/** Completes an OAuth sign-in with the code from the callback, then connects. */
export async function finishSignIn(workspaceDir: string, integration: Integration, code: string, redirectUrl: string): Promise<Connection> {
  const transport = new StreamableHTTPClientTransport(new URL(integration.url!), { authProvider: integrationAuthProvider(workspaceDir, integration, redirectUrl) })
  await transport.finishAuth(code)
  clearPendingAuth(integration.id)
  await disconnect(integration.id)
  return connection(workspaceDir, integration, { redirectUrl, retry: true })
}
