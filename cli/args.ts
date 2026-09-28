import { basename, dirname, resolve } from 'node:path'

export interface McpCliOptions {
  workspaceDir: string
  bookId?: string
}

export interface ServeCliOptions {
  /** Book folder (contains wrote.json) or a folder of books; resolved to an absolute path. */
  folder: string
  /** Explicit port (used as is); without it the launcher picks a free one from 3000 up. */
  port?: number
  host: string
  open: boolean
}

export type CliCommand
  = | { command: 'serve', options: ServeCliOptions }
    | { command: 'mcp', options: McpCliOptions }
    | { command: 'help' }
    | { command: 'version' }
    | { error: string }

const MCP_USAGE = `Usage: wrote mcp [--book <path-to-book-folder>] [--workspace <dir>]

Serves Wrote's tools over MCP (stdio) for desktop agents like Claude Desktop.
  --book       A book folder (contains wrote.json). Calls default to this book.
  --workspace  Folder with your books (default: $WROTE_WORKSPACE or ~/Wrote).`

const USAGE = `Usage: wrote [folder] [--port <n>] [--host <address>] [--no-open]
       wrote mcp [--book <folder>] [--workspace <dir>]

Starts Wrote on a book folder (contains wrote.json) or a folder of books (default: the current folder)
and opens it in your browser.
  --port     Port to listen on (default: the first free port from 3000)
  --host     Address to listen on (default: 127.0.0.1; use 0.0.0.0 to allow other devices)
  --no-open  Do not open the browser

${MCP_USAGE}`

/** Parses `wrote mcp …` arguments. A `--book` folder makes its parent the workspace. */
export function parseMcpArgs(argv: string[], env: Record<string, string | undefined>, home: string): McpCliOptions | { error: string } {
  const [command, ...rest] = argv
  if (command !== 'mcp') return { error: MCP_USAGE }
  let book: string | undefined
  let workspace: string | undefined
  for (let i = 0; i < rest.length; i++) {
    const flag = rest[i]
    const value = rest[i + 1]
    if ((flag === '--book' || flag === '--workspace') && value) {
      if (flag === '--book') book = value
      else workspace = value
      i++
    }
    else {
      return { error: MCP_USAGE }
    }
  }
  if (book) {
    const path = resolve(book)
    return { workspaceDir: dirname(path), bookId: basename(path) }
  }
  return { workspaceDir: resolve(workspace ?? env.WROTE_WORKSPACE ?? env.NUXT_WORKSPACE_DIR ?? `${home}/Wrote`) }
}

const parsePort = (value: string | undefined) => {
  const port = Number(value)
  return Number.isInteger(port) && port > 0 && port < 65536 ? port : null
}

/** Parses `wrote [folder] …` (the launcher). Relative folders resolve against `cwd`. */
export function parseServeArgs(argv: string[], cwd: string): ServeCliOptions | { error: string } {
  const options: ServeCliOptions = { folder: cwd, host: '127.0.0.1', open: true }
  let folder: string | undefined
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!
    if (arg === '--no-open') {
      options.open = false
    }
    else if (arg === '--port') {
      const port = parsePort(argv[++i])
      if (port === null) return { error: `Invalid --port.\n\n${USAGE}` }
      options.port = port
    }
    else if (arg === '--host' && argv[i + 1]) {
      options.host = argv[++i]!
    }
    else if (!arg.startsWith('-') && folder === undefined) {
      folder = arg
    }
    else {
      return { error: USAGE }
    }
  }
  return { ...options, folder: resolve(cwd, folder ?? '.') }
}

/** Parses the whole command line: `wrote [folder]`, `wrote mcp …`, `--help`, `--version`. */
export function parseCliArgs(argv: string[], env: Record<string, string | undefined>, home: string, cwd: string): CliCommand {
  const first = argv[0]
  if (first === '--help' || first === '-h' || first === 'help') return { command: 'help' }
  if (first === '--version' || first === '-v') return { command: 'version' }
  if (first === 'mcp') {
    const options = parseMcpArgs(argv, env, home)
    return 'error' in options ? options : { command: 'mcp', options }
  }
  const options = parseServeArgs(argv, cwd)
  return 'error' in options ? options : { command: 'serve', options }
}

export { MCP_USAGE, USAGE }
