import { basename, dirname, resolve } from 'node:path'

export interface McpCliOptions {
  workspaceDir: string
  bookId?: string
}

const USAGE = `Usage: wrote mcp [--book <path-to-book-folder>] [--workspace <dir>]

Serves Wrote's tools over MCP (stdio) for desktop agents like Claude Desktop.
  --book       A book folder (contains wrote.json). Calls default to this book.
  --workspace  Folder with your books (default: $WROTE_WORKSPACE or ~/Wrote).`

/** Parses `wrote mcp …` arguments. A `--book` folder makes its parent the workspace. */
export function parseMcpArgs(argv: string[], env: Record<string, string | undefined>, home: string): McpCliOptions | { error: string } {
  const [command, ...rest] = argv
  if (command !== 'mcp') return { error: USAGE }
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
      return { error: USAGE }
    }
  }
  if (book) {
    const path = resolve(book)
    return { workspaceDir: dirname(path), bookId: basename(path) }
  }
  return { workspaceDir: resolve(workspace ?? env.WROTE_WORKSPACE ?? env.NUXT_WORKSPACE_DIR ?? `${home}/Wrote`) }
}

export { USAGE }
