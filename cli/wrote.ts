import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseCliArgs, USAGE, type McpCliOptions, type ServeCliOptions } from './args'
import { appUrl, findFreePort, openBrowser, resolveServeTarget, serverEntry, startServer, waitForHealth } from './serve'

const cliFile = fileURLToPath(import.meta.url)

/** `wrote mcp` – serves the shared tools over stdio (stdout is the protocol channel; logs go to stderr). */
async function mcp(options: McpCliOptions) {
  // Loaded on demand: the launcher does not need the MCP server and its database stack.
  const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js')
  const { agentsForPrompts } = await import('../server/mcp/agent-prompts')
  const { createWroteMcpServer } = await import('../server/mcp/server')
  const { closeAllBooks, openBook } = await import('../server/services/workspace')
  // Review agents as prompts: the built-ins, plus the custom agents of the book the server was started for.
  const agents = await agentsForPrompts(options.bookId ? [await openBook(options.workspaceDir, options.bookId)] : [])
  const server = createWroteMcpServer({ workspaceDir: options.workspaceDir, defaultBookId: options.bookId, caller: { kind: 'mcp', name: 'MCP (stdio)' }, agents })
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

/** `wrote [folder]` – starts the built app on the folder, waits until it is healthy and opens the browser. */
async function serve(options: ServeCliOptions) {
  const target = resolveServeTarget(options.folder)
  const port = options.port ?? await findFreePort(3000, options.host)
  const child = await startServer({ entry: serverEntry(cliFile), target, host: options.host, port })
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => child.kill(signal))
  child.on('exit', code => process.exit(code ?? 0))
  await waitForHealth(`${appUrl(options.host, port)}api/health`, child)
  const url = appUrl(options.host, port, target.bookId)
  process.stdout.write(`\nWrote is running at ${url}\nBooks folder: ${target.workspaceDir}\nPress Ctrl+C to stop.\n\n`)
  if (options.open && !process.env.CI) openBrowser(url)
}

function version(): string {
  const pkg = JSON.parse(readFileSync(resolve(dirname(cliFile), '../../package.json'), 'utf8')) as { version: string }
  return pkg.version
}

async function main() {
  const parsed = parseCliArgs(process.argv.slice(2), process.env, homedir(), process.cwd())
  if ('error' in parsed) {
    process.stderr.write(`${parsed.error}\n`)
    process.exit(1)
  }
  if (parsed.command === 'help') process.stdout.write(`${USAGE}\n`)
  else if (parsed.command === 'version') process.stdout.write(`${version()}\n`)
  else if (parsed.command === 'mcp') await mcp(parsed.options)
  else await serve(parsed.options)
}

main().catch((error) => {
  process.stderr.write(`wrote failed: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
})
