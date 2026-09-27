import { mkdtemp, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { checkMcpAccess, ensureMcpToken, isLocalHostname } from './mcp-auth'

describe('MCP token', () => {
  it('is created once, owner-only, and reused', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'wrote-mcp-'))
    const token = await ensureMcpToken(workspace)
    expect(token).toMatch(/^wrote_[0-9a-f]{48}$/)
    expect(await ensureMcpToken(workspace)).toBe(token)
    expect((await stat(join(workspace, '.wrote', 'mcp-token'))).mode & 0o777).toBe(0o600)
  })
})

describe('checkMcpAccess', () => {
  const token = 'wrote_secret'
  const ok = { host: 'localhost:3000', authorization: `Bearer ${token}` }

  it('accepts local requests with the token', () => {
    expect(checkMcpAccess(ok, token)).toEqual({ ok: true })
    expect(checkMcpAccess({ ...ok, host: '127.0.0.1:3000', origin: 'http://localhost:5173' }, token)).toEqual({ ok: true })
  })

  it('rejects missing or wrong tokens', () => {
    expect(checkMcpAccess({ host: 'localhost' }, token)).toMatchObject({ ok: false, status: 401 })
    expect(checkMcpAccess({ ...ok, authorization: 'Bearer wrote_secreT' }, token)).toMatchObject({ ok: false, status: 401 })
  })

  it('rejects non-local hosts and foreign origins (DNS rebinding, browsers)', () => {
    expect(checkMcpAccess({ ...ok, host: 'evil.example:3000' }, token)).toMatchObject({ ok: false, status: 403 })
    expect(checkMcpAccess({ ...ok, origin: 'https://evil.example' }, token)).toMatchObject({ ok: false, status: 403 })
  })

  it('recognizes local hostnames', () => {
    expect(isLocalHostname('[::1]:3000')).toBe(true)
    expect(isLocalHostname('localhost.evil.example')).toBe(false)
    expect(isLocalHostname(undefined)).toBe(false)
  })
})
