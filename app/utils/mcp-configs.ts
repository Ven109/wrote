export interface McpClientConfig {
  id: 'claude-code' | 'claude-desktop' | 'cursor'
  label: string
  /** Where the snippet goes. */
  hint: string
  language: 'bash' | 'json'
  snippet: string
}

/** Copy-paste configs for common MCP clients (HTTP endpoint with bearer token, or stdio for desktop apps). */
export function mcpClientConfigs(url: string, token: string): McpClientConfig[] {
  const http = { type: 'http', url, headers: { Authorization: `Bearer ${token}` } }
  return [
    {
      id: 'claude-code',
      label: 'Claude Code',
      hint: 'Run in a terminal:',
      language: 'bash',
      snippet: `claude mcp add --transport http wrote ${url} --header "Authorization: Bearer ${token}"`,
    },
    {
      id: 'cursor',
      label: 'Cursor',
      hint: 'Add to ~/.cursor/mcp.json:',
      language: 'json',
      snippet: JSON.stringify({ mcpServers: { wrote: { url, headers: http.headers } } }, null, 2),
    },
    {
      id: 'claude-desktop',
      label: 'Claude Desktop',
      hint: 'Add to claude_desktop_config.json (stdio; replace the book path):',
      language: 'json',
      snippet: JSON.stringify({ mcpServers: { wrote: { command: 'npx', args: ['wrote', 'mcp', '--book', '/path/to/Wrote/my-book'] } } }, null, 2),
    },
  ]
}
