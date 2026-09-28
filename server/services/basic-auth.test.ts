import { describe, expect, it } from 'vitest'
import { basicAuthConfig, isAuthorized, parseBasicAuth } from './basic-auth'

const config = { user: 'ada', password: 's3cret:with-colon' }
const basic = (user: string, password: string) => `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`

describe('basicAuthConfig', () => {
  it('is on only when both user and password are set', () => {
    expect(basicAuthConfig({ WROTE_AUTH_USER: 'ada', WROTE_AUTH_PASSWORD: 'pw' })).toEqual({ user: 'ada', password: 'pw' })
    expect(basicAuthConfig({ WROTE_AUTH_USER: 'ada' })).toBeNull()
    expect(basicAuthConfig({ WROTE_AUTH_PASSWORD: 'pw' })).toBeNull()
    expect(basicAuthConfig({})).toBeNull()
  })
})

describe('parseBasicAuth', () => {
  it('decodes user and password, keeping colons in the password', () => {
    expect(parseBasicAuth(basic('ada', 'a:b'))).toEqual({ user: 'ada', password: 'a:b' })
  })

  it('rejects other schemes and malformed values', () => {
    expect(parseBasicAuth('Bearer abc')).toBeNull()
    expect(parseBasicAuth(`Basic ${Buffer.from('nocolon').toString('base64')}`)).toBeNull()
    expect(parseBasicAuth(undefined)).toBeNull()
  })
})

describe('isAuthorized', () => {
  it('lets everything through when auth is off', () => {
    expect(isAuthorized({ path: '/api/books' }, null)).toBe(true)
  })

  it('requires matching credentials for the app and API', () => {
    expect(isAuthorized({ path: '/' }, config)).toBe(false)
    expect(isAuthorized({ path: '/api/books', authorization: basic('ada', 'wrong') }, config)).toBe(false)
    expect(isAuthorized({ path: '/api/books', authorization: basic('eve', config.password) }, config)).toBe(false)
    expect(isAuthorized({ path: '/api/books?x=1', authorization: basic('ada', config.password) }, config)).toBe(true)
  })

  it('keeps the health check public', () => {
    expect(isAuthorized({ path: '/api/health' }, config)).toBe(true)
    expect(isAuthorized({ path: '/api/health/?probe=1' }, config)).toBe(true)
  })

  it('passes MCP bearer tokens on to the MCP route, but still guards /mcp otherwise', () => {
    expect(isAuthorized({ path: '/mcp', authorization: 'Bearer wrote_abc' }, config)).toBe(true)
    expect(isAuthorized({ path: '/mcp' }, config)).toBe(false)
    expect(isAuthorized({ path: '/mcp', authorization: basic('ada', config.password) }, config)).toBe(true)
    expect(isAuthorized({ path: '/api/books', authorization: 'Bearer wrote_abc' }, config)).toBe(false)
  })
})
