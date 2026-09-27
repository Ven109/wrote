import { describe, expect, it } from 'vitest'
import { mcpClientConfigs } from './mcp-configs'

describe('mcpClientConfigs', () => {
  it('builds HTTP configs with the token and a stdio config for Claude Desktop', () => {
    const configs = mcpClientConfigs('http://localhost:3000/mcp', 'wrote_abc')
    const byId = Object.fromEntries(configs.map(config => [config.id, config]))
    expect(byId['claude-code']!.snippet).toBe('claude mcp add --transport http wrote http://localhost:3000/mcp --header "Authorization: Bearer wrote_abc"')
    expect(JSON.parse(byId.cursor!.snippet)).toEqual({ mcpServers: { wrote: { url: 'http://localhost:3000/mcp', headers: { Authorization: 'Bearer wrote_abc' } } } })
    expect(JSON.parse(byId['claude-desktop']!.snippet).mcpServers.wrote.args).toEqual(['wrote', 'mcp', '--book', '/path/to/Wrote/my-book'])
  })
})
