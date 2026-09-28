import { BOOK_LAYOUT } from '#shared/book/layout'
import { RESERVED_CODEX_KEYS } from '#shared/schemas/codex'
import type { Outline } from '#shared/schemas/outline'
import { parseOutline } from '#shared/utils/outline-format'
import { listCodex } from '../services/codex'
import { pathForId } from '../services/entries'
import { getStructure, type StructureNode } from '../services/structure'
import { summaryOutline, type OutlineNode } from '../services/summary-edits'
import type { BookContext } from '../services/workspace'

/** `wrote://` URIs of book content exposed as MCP resources. */
export const bookUri = {
  scene: (bookId: string, entryId: string) => `wrote://book/${bookId}/scene/${entryId}`,
  codex: (bookId: string, codexType: string, entryId: string) => `wrote://book/${bookId}/codex/${codexType}/${entryId}`,
  styleGuide: (bookId: string) => `wrote://book/${bookId}/style-guide`,
  outline: (bookId: string) => `wrote://book/${bookId}/outline`,
}

export interface BookResource {
  uri: string
  name: string
  title: string
  description?: string
  mimeType: 'text/markdown'
}

export interface ResourceText {
  uri: string
  mimeType: 'text/markdown'
  text: string
}

const markdown = (uri: string, text: string): ResourceText => ({ uri, mimeType: 'text/markdown', text })
const scenesOf = (nodes: StructureNode[]): StructureNode[] => nodes.flatMap(node => (node.type === 'scene' ? [node] : scenesOf(node.children)))

/** Everything a client can list for a book: scenes (reading order), codex entries, style guide and outline. */
export async function listBookResources(book: BookContext, bookTitle: string): Promise<BookResource[]> {
  const [structure, codex] = await Promise.all([getStructure(book.db), listCodex(book)])
  const resource = (uri: string, name: string, title: string, description?: string): BookResource => ({ uri, name, title, mimeType: 'text/markdown', ...(description ? { description } : {}) })
  return [
    resource(bookUri.outline(book.id), `${book.id}/outline`, `${bookTitle}: outline`, 'Structure with summaries, plus the outline notes'),
    resource(bookUri.styleGuide(book.id), `${book.id}/style-guide`, `${bookTitle}: style guide`),
    ...scenesOf(structure).map(scene => resource(bookUri.scene(book.id, scene.id), `${book.id}/scene/${scene.id}`, scene.title, `Scene, ${scene.wordCount} words`)),
    ...codex.map(entry => resource(bookUri.codex(book.id, entry.codexType, entry.id), `${book.id}/codex/${entry.id}`, entry.title, `Codex: ${entry.codexType}`)),
  ]
}

async function readEntryById(book: BookContext, entryId: string, type: string) {
  const entry = await book.repository.read(await pathForId(book.db, entryId))
  if (entry.type !== type) throw new Error(`${entryId} is not a ${type}`)
  return entry
}

export async function readSceneResource(book: BookContext, entryId: string): Promise<ResourceText> {
  const scene = await readEntryById(book, entryId, 'scene')
  const meta = (['status', 'pov', 'location', 'timeline', 'synopsis'] as const)
    .map(key => [key, (scene.frontmatter as Record<string, unknown>)[key]] as const)
    .filter(([, value]) => typeof value === 'string' && value)
    .map(([key, value]) => `- ${key}: ${value}`)
  return markdown(bookUri.scene(book.id, entryId), [`# ${scene.frontmatter.title}`, meta.join('\n'), scene.body.trim()].filter(Boolean).join('\n\n'))
}

export async function readCodexResource(book: BookContext, codexType: string, entryId: string): Promise<ResourceText> {
  const entry = await readEntryById(book, entryId, 'codex')
  const frontmatter = entry.frontmatter as Record<string, unknown>
  if (frontmatter.codexType !== codexType) throw new Error(`${entryId} is not a ${codexType}`)
  const aliases = Array.isArray(frontmatter.aliases) && frontmatter.aliases.length ? [`- aliases: ${(frontmatter.aliases as string[]).join(', ')}`] : []
  const fields = Object.entries(frontmatter)
    .filter(([key, value]) => !(RESERVED_CODEX_KEYS as readonly string[]).includes(key) && key !== 'detect' && value !== null && value !== '')
    .map(([key, value]) => `- ${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
  return markdown(bookUri.codex(book.id, codexType, entryId), [`# ${frontmatter.title} (${codexType})`, [...aliases, ...fields].join('\n'), entry.body.trim()].filter(Boolean).join('\n\n'))
}

export async function readStyleGuideResource(book: BookContext): Promise<ResourceText> {
  const guide = await book.repository.read(BOOK_LAYOUT.styleGuide).catch(() => null)
  return markdown(bookUri.styleGuide(book.id), guide?.body.trim() || '(No style guide yet.)')
}

function outlineLines(nodes: OutlineNode[], depth: number): string[] {
  return nodes.flatMap(node => [
    `${'  '.repeat(depth)}- **${node.title}** (${node.type}, ${node.id})${node.summary ? `: ${node.summary.replace(/\s+/g, ' ')}` : ''}`,
    ...outlineLines(node.children ?? [], depth + 1),
  ])
}

/** The book at a glance: the author's outline notes, the whole-book summary and the structure with summaries. */
/** Acts → beats as Markdown lines, with linked scenes or "not written yet". */
function plotLines(outline: Outline): string[] {
  return outline.acts.flatMap(act => [
    `- **${act.title}**`,
    ...act.beats.map(beat => `  - ${beat.title} (${beat.id}; ${beat.scenes.length ? `scenes ${beat.scenes.join(', ')}` : 'not written yet'})${beat.summary ? `: ${beat.summary.replace(/\s+/g, ' ')}` : ''}`),
  ])
}

/** The book at a glance: the author's outline notes and plot (acts → beats), the summary and the structure with summaries. */
export async function readOutlineResource(book: BookContext): Promise<ResourceText> {
  const [entry, { book: summary, outline: structure }] = await Promise.all([
    book.repository.read(BOOK_LAYOUT.outline).catch(() => null),
    summaryOutline(book, { includeScenes: true }),
  ])
  const plot = parseOutline(entry?.body ?? '')
  const sections = [
    plot.notes ? `## Outline notes\n\n${plot.notes}` : '',
    plot.acts.length ? `## Plot\n\n${plotLines(plot).join('\n')}` : '',
    summary ? `## Summary\n\n${summary}` : '',
    `## Structure\n\n${outlineLines(structure, 0).join('\n') || '(No parts yet.)'}`,
  ]
  return markdown(bookUri.outline(book.id), sections.filter(Boolean).join('\n\n'))
}
