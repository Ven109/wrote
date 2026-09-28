import { createHash, timingSafeEqual } from 'node:crypto'

export interface BasicAuthConfig {
  user: string
  password: string
}

/** Paths reachable without credentials: the health check used by Docker and uptime probes (reveals nothing). */
const PUBLIC_PATHS = new Set(['/api/health'])

/** Optional HTTP basic auth for self-hosting: on only when both `WROTE_AUTH_USER` and `WROTE_AUTH_PASSWORD` are set. */
export function basicAuthConfig(env: Record<string, string | undefined>): BasicAuthConfig | null {
  const user = env.WROTE_AUTH_USER
  const password = env.WROTE_AUTH_PASSWORD
  return user && password ? { user, password } : null
}

const digest = (value: string) => createHash('sha256').update(value).digest()
/** Constant-time comparison (hashing first makes the lengths equal). */
const safeEqual = (a: string, b: string) => timingSafeEqual(digest(a), digest(b))

/** Decodes an `Authorization: Basic …` header into user and password (null if it is not one). */
export function parseBasicAuth(header: string | undefined): BasicAuthConfig | null {
  const match = /^Basic\s+([\w+/=-]+)\s*$/i.exec(header ?? '')
  if (!match) return null
  const decoded = Buffer.from(match[1]!, 'base64').toString('utf8')
  const colon = decoded.indexOf(':')
  return colon < 0 ? null : { user: decoded.slice(0, colon), password: decoded.slice(colon + 1) }
}

const pathname = (path: string) => path.split('?')[0]!.replace(/\/+$/, '') || '/'

/**
 * Whether a request may pass. With auth off everything passes. `/mcp` requests carrying a bearer token pass on
 * to the MCP route, which checks the token itself (MCP clients cannot send basic auth and a token at once).
 */
export function isAuthorized(request: { path: string, authorization?: string }, config: BasicAuthConfig | null): boolean {
  if (!config) return true
  const path = pathname(request.path)
  if (PUBLIC_PATHS.has(path)) return true
  if (path === '/mcp' && /^Bearer\s+\S/i.test(request.authorization ?? '')) return true
  const credentials = parseBasicAuth(request.authorization)
  if (!credentials) return false
  // Both comparisons always run, so timing does not reveal which part was wrong.
  const userOk = safeEqual(credentials.user, config.user)
  const passwordOk = safeEqual(credentials.password, config.password)
  return userOk && passwordOk
}

export const BASIC_AUTH_CHALLENGE = 'Basic realm="Wrote", charset="UTF-8"'
