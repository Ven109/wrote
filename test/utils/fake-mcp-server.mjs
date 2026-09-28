// A tiny stdio MCP server for tests: `web_search` returns canned results, `crash` exits the process.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const server = new McpServer({ name: 'fake-search', version: '1.0.0' })
server.registerTool('web_search', {
  title: 'Web search',
  description: 'Searches the web',
  inputSchema: { query: z.string() },
}, async ({ query }) => ({ content: [{ type: 'text', text: `Results for "${query}": Lighthouses were automated in the 1980s (${process.env.FAKE_SEARCH_KEY ? 'with key' : 'no key'}).` }] }))
server.registerTool('crash', { title: 'Crash', description: 'Stops the server', inputSchema: {} }, async () => {
  setTimeout(() => process.exit(1), 10)
  return { content: [{ type: 'text', text: 'bye' }] }
})
await server.connect(new StdioServerTransport())
