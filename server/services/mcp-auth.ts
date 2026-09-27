import { randomBytes, timingSafeEqual } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { settingsPath } from '../storage/app-settings'

const TOKEN_FILE = 'mcp-token'
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])

const readToken = (path: string) => readFile(path, 'utf8').then(text => text.trim(), () => '')

async function readOrCreateToken(workspaceDir: string): Promise<string> {
  const path = settingsPath(workspaceDir, TOKEN_FILE)
  const existing = await readToken(path)
  if (existing) return existing
  const token = `wrote_${randomBytes(24).toString('hex')}`
  await mkdir(dirname(path), { recursive: true })
  try {
    // Exclusive create: if another process got there first, its token wins and is read back.
    await writeFile(path, `${token}\n`, { mode: 0o600, flag: 'wx' })
    return token
  }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
    return readToken(path)
  }
}

const creating = new Map<string, Promise<string>>()

/**
 * The workspace's MCP bearer token, created on first use (owner-only file `.wrote/mcp-token`). Concurrent
 * first calls share one creation, so no caller ever holds a token that was overwritten.
 */
export function ensureMcpToken(workspaceDir: string): Promise<string> {
  const pending = creating.get(workspaceDir)
  if (pending) return pending
  const task = readOrCreateToken(workspaceDir).finally(() => creating.delete(workspaceDir))
  creating.set(workspaceDir, task)
  return task
}

function hostnameOf(value: string): string | null {
  try {
    return new URL(value.includes('://') ? value : `http://${value}`).hostname
  }
  catch {
    return null
  }
}

export const isLocalHostname = (value: string | undefined) => {
  const hostname = value ? hostnameOf(value) : null
  return hostname !== null && LOCAL_HOSTNAMES.has(hostname)
}

function bearerMatches(authorization: string | undefined, token: string): boolean {
  const presented = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? ''
  const a = Buffer.from(presented)
  const b = Buffer.from(token)
  return a.length === b.length && timingSafeEqual(a, b)
}

export type McpAccess = { ok: true } | { ok: false, status: 401 | 403, message: string }

/**
 * Guards the MCP HTTP endpoint: only localhost (Host header, DNS-rebinding safe), no foreign browser
 * origins, and the workspace bearer token.
 */
export function checkMcpAccess(request: { authorization?: string, origin?: string, host?: string }, token: string): McpAccess {
  if (!isLocalHostname(request.host)) return { ok: false, status: 403, message: 'MCP is only available on localhost' }
  if (request.origin && !isLocalHostname(request.origin)) return { ok: false, status: 403, message: 'Origin not allowed' }
  if (!bearerMatches(request.authorization, token)) return { ok: false, status: 401, message: 'Missing or invalid MCP token' }
  return { ok: true }
}
