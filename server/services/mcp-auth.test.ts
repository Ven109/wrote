import { describe, expect, it } from 'vitest'
import { checkMcpAccess, isLocalHostname } from './mcp-auth'

describe('checkMcpAccess', () => {
  it('accepts local requests', () => {
    expect(checkMcpAccess({ host: 'localhost:3000' })).toEqual({ ok: true })
    expect(checkMcpAccess({ host: '127.0.0.1:3000', origin: 'http://localhost:5173' })).toEqual({ ok: true })
  })

  it('rejects non-local hosts and foreign origins (DNS rebinding, browsers)', () => {
    expect(checkMcpAccess({ host: 'evil.example:3000' })).toMatchObject({ ok: false, status: 403 })
    expect(checkMcpAccess({ host: 'localhost', origin: 'https://evil.example' })).toMatchObject({ ok: false, status: 403 })
  })

  it('recognizes local hostnames', () => {
    expect(isLocalHostname('[::1]:3000')).toBe(true)
    expect(isLocalHostname('localhost.evil.example')).toBe(false)
    expect(isLocalHostname(undefined)).toBe(false)
  })
})
