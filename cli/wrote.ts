import { homedir } from 'node:os'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createWroteMcpServer } from '../server/mcp/server'
import { closeAllBooks } from '../server/services/workspace'
import { parseMcpArgs } from './args'

/** `wrote mcp` – serves the shared tools over stdio (stdout is the protocol channel; logs go to stderr). */
async function main() {
  const options = parseMcpArgs(process.argv.slice(2), process.env, homedir())
  if ('error' in options) {
    process.stderr.write(`${options.error}\n`)
    process.exit(1)
  }
  const server = createWroteMcpServer({ workspaceDir: options.workspaceDir, defaultBookId: options.bookId, caller: { kind: 'mcp', name: 'MCP (stdio)' } })
  const shutdown = async () => {
    await server.close()
    await closeAllBooks()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
  process.stdin.on('close', shutdown)
  await server.connect(new StdioServerTransport())
  process.stderr.write(`wrote mcp: serving ${options.bookId ? `book "${options.bookId}" in ` : ''}${options.workspaceDir}\n`)
}

main().catch((error) => {
  process.stderr.write(`wrote mcp failed: ${error instanceof Error ? error.stack : String(error)}\n`)
  process.exit(1)
})
