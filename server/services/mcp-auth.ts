const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])

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

export type McpAccess = { ok: true } | { ok: false, status: 403, message: string }

/**
 * Guards the MCP HTTP endpoint before the token is checked: only localhost (Host header, DNS-rebinding safe)
 * and no foreign browser origins.
 */
export function checkMcpAccess(request: { origin?: string, host?: string }): McpAccess {
  if (!isLocalHostname(request.host)) return { ok: false, status: 403, message: 'MCP is only available on localhost' }
  if (request.origin && !isLocalHostname(request.origin)) return { ok: false, status: 403, message: 'Origin not allowed' }
  return { ok: true }
}
