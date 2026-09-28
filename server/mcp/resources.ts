import { ResourceTemplate, type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getBookSummary, listBooks } from '../services/books'
import { openBook } from '../services/workspace'
import { listBookResources, readCodexResource, readOutlineResource, readSceneResource, readStyleGuideResource, type ResourceText } from './book-resources'
import type { WroteMcpOptions } from './server'

type Vars = Record<string, string | string[]>
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? ''

/** The books a client may see: the server's book (stdio `--book`), else every book of the workspace. */
async function visibleBooks(options: WroteMcpOptions) {
  return options.defaultBookId ? [await getBookSummary(options.workspaceDir, options.defaultBookId)] : listBooks(options.workspaceDir)
}

async function bookFor(options: WroteMcpOptions, bookId: string) {
  if (options.defaultBookId && bookId !== options.defaultBookId) throw new Error(`Unknown book ${bookId}`)
  return openBook(options.workspaceDir, bookId)
}

/**
 * Registers book content as MCP resources (read level): scenes, codex entries, the style guide and the
 * outline, all listable.
 */
export function registerBookResources(server: McpServer, options: WroteMcpOptions): void {
  // The SDK concatenates template listings: one list callback returns every resource of every visible book.
  const list = async () => {
    const books = await visibleBooks(options)
    const resources = await Promise.all(books.map(async summary => listBookResources(await openBook(options.workspaceDir, summary.id), summary.title)))
    return { resources: resources.flat() }
  }
  const read = (reader: (vars: Vars) => Promise<ResourceText>) => async (_uri: URL, vars: Vars) => ({ contents: [await reader(vars)] })

  server.registerResource('scene', new ResourceTemplate('wrote://book/{bookId}/scene/{entryId}', { list }), {
    title: 'Scene', description: 'A scene of the manuscript (Markdown) with its status, POV, location and synopsis', mimeType: 'text/markdown',
  }, read(async vars => readSceneResource(await bookFor(options, one(vars.bookId)), one(vars.entryId))))

  server.registerResource('codex-entry', new ResourceTemplate('wrote://book/{bookId}/codex/{codexType}/{entryId}', { list: undefined }), {
    title: 'Codex entry', description: 'A character, place, item, … of the story bible, with its fields and description', mimeType: 'text/markdown',
  }, read(async vars => readCodexResource(await bookFor(options, one(vars.bookId)), one(vars.codexType), one(vars.entryId))))

  server.registerResource('style-guide', new ResourceTemplate('wrote://book/{bookId}/style-guide', { list: undefined }), {
    title: 'Style guide', description: 'The book\'s style guide: voice, tense, rules for the prose', mimeType: 'text/markdown',
  }, read(async vars => readStyleGuideResource(await bookFor(options, one(vars.bookId)))))

  server.registerResource('outline', new ResourceTemplate('wrote://book/{bookId}/outline', { list: undefined }), {
    title: 'Outline', description: 'The book at a glance: outline notes, summary, and parts → chapters → scenes with summaries', mimeType: 'text/markdown',
  }, read(async vars => readOutlineResource(await bookFor(options, one(vars.bookId)))))
}
