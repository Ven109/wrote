import type { LinkRef } from '#shared/schemas/links'
import type { EntryType } from '#shared/schemas/entry'
import type { IndexDb } from './client'

export interface SearchOptions {
  types?: EntryType[]
  tags?: string[]
  status?: string[]
  limit?: number
  /** Match entries containing any of the words (ranked by BM25) instead of all – for retrieval from questions. */
  anyTerm?: boolean
}

export interface SearchHit {
  id: string
  path: string
  type: EntryType
  title: string
  snippet: string
  score: number
}

/** Function words that carry no meaning for retrieval (English; other languages rely on BM25's IDF). */
const STOPWORDS = new Set('the and for are but not you all any can had her was one our out has him his how its who why what when where which does did with that this from have they will would there their them then than been into about over also some such only other more most very just your were should could'.split(' '))

/**
 * Turns free text into a safe FTS5 query: quoted terms, prefix match on the last term. With `anyTerm`,
 * words of 3+ letters that are not stopwords are OR-ed, so a question matches entries sharing some words.
 */
export function toFtsQuery(text: string, options: { anyTerm?: boolean } = {}): string | null {
  const terms = text.toLowerCase().match(/[\p{L}\p{N}]+/gu)
  if (!terms?.length) return null
  if (options.anyTerm) {
    const words = [...new Set(terms.filter(term => term.length >= 3 && !STOPWORDS.has(term)))]
    return words.length ? words.map(word => `"${word}"`).join(' OR ') : null
  }
  return terms.map((term, i) => `"${term}"${i === terms.length - 1 ? '*' : ''}`).join(' ')
}

function placeholders(values: unknown[]) {
  return values.map(() => '?').join(', ')
}

/** SQL conditions on the `entries e` alias for the search filters (parameterized). */
export function filterClause(options: SearchOptions): { sql: string, args: string[] } {
  const where: string[] = []
  const args: string[] = []
  if (options.types?.length) {
    where.push(`e.type IN (${placeholders(options.types)})`)
    args.push(...options.types)
  }
  if (options.status?.length) {
    where.push(`e.status IN (${placeholders(options.status)})`)
    args.push(...options.status)
  }
  if (options.tags?.length) {
    where.push(`e.id IN (SELECT entry_id FROM tags WHERE tag IN (${placeholders(options.tags)}))`)
    args.push(...options.tags)
  }
  return { sql: where.join(' AND '), args }
}

/** Full-text search ranked by BM25 (title weighted higher) with highlighted snippets. */
export async function searchEntries(db: IndexDb, text: string, options: SearchOptions = {}): Promise<SearchHit[]> {
  const query = toFtsQuery(text, { anyTerm: options.anyTerm })
  if (!query) return []
  const filter = filterClause(options)
  const where = ['entries_fts MATCH ?', ...(filter.sql ? [filter.sql] : [])]
  const args: (string | number)[] = [query, ...filter.args]
  args.push(options.limit ?? 20)
  const result = await db.$client.execute({
    sql: `SELECT e.id, e.path, e.type, e.title,
            snippet(entries_fts, 2, '<mark>', '</mark>', '…', 12) AS snippet,
            bm25(entries_fts, 0, 5, 1) AS score
          FROM entries_fts JOIN entries e ON e.id = entries_fts.id
          WHERE ${where.join(' AND ')}
          ORDER BY score LIMIT ?`,
    args,
  })
  return result.rows.map(row => ({
    id: String(row.id),
    path: String(row.path),
    type: String(row.type) as EntryType,
    title: String(row.title),
    snippet: String(row.snippet),
    score: Number(row.score),
  }))
}

export type { LinkRef }

/** Entries linking to `entryId` (by id, title or alias). */
export async function backlinks(db: IndexDb, entryId: string): Promise<LinkRef[]> {
  const result = await db.$client.execute({
    sql: `SELECT DISTINCT e.id, e.path, e.type, e.title FROM links l
          JOIN entry_names n ON n.name = l.target AND n.entry_id = ?
          JOIN entries e ON e.id = l.source_id
          WHERE e.id != ? ORDER BY e.title`,
    args: [entryId, entryId],
  })
  return result.rows.map(row => ({ id: String(row.id), path: String(row.path), type: String(row.type) as EntryType, title: String(row.title) }))
}

/** Entries that `entryId` links to (resolved), plus unresolved targets. */
export async function outgoingLinks(db: IndexDb, entryId: string): Promise<{ resolved: LinkRef[], unresolved: string[] }> {
  const result = await db.$client.execute({
    sql: `SELECT l.target, e.id, e.path, e.type, e.title FROM links l
          LEFT JOIN entry_names n ON n.name = l.target
          LEFT JOIN entries e ON e.id = n.entry_id
          WHERE l.source_id = ?`,
    args: [entryId],
  })
  const resolved = new Map<string, LinkRef>()
  const unresolved = new Set<string>()
  for (const row of result.rows) {
    if (row.id) resolved.set(String(row.id), { id: String(row.id), path: String(row.path), type: String(row.type) as EntryType, title: String(row.title) })
    else unresolved.add(String(row.target))
  }
  return { resolved: [...resolved.values()], unresolved: [...unresolved] }
}
