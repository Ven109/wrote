import { z } from 'zod'
import type { CodexEntrySummary, CodexQuery, CodexTypeTemplate } from '#shared/schemas/codex'
import type { EntryDocument } from '#shared/schemas/document'
import { applyChange } from '../db/indexer'
import { toFtsQuery } from '../db/queries'
import { listCodexTypes, validateFields, type FieldValue } from '../codex/types'
import { InvalidInputError, NotFoundError } from '../storage/errors'
import type { BookContext } from './workspace'

const toSummary = (row: Record<string, unknown>): CodexEntrySummary => {
  const frontmatter = JSON.parse(String(row.frontmatter)) as { codexType?: string, aliases?: string[] }
  return {
    id: String(row.id),
    path: String(row.path),
    title: String(row.title),
    codexType: frontmatter.codexType ?? 'lore',
    aliases: Array.isArray(frontmatter.aliases) ? frontmatter.aliases : [],
    tags: JSON.parse(String(row.tags)) as string[],
    excerpt: String(row.excerpt ?? '').replace(/\s+/g, ' ').trim(),
  }
}

/** Codex entries filtered by type, tag and a name/alias/full-text query, sorted by title. */
export async function listCodex(book: BookContext, query: CodexQuery = {}): Promise<CodexEntrySummary[]> {
  const where = [`e.type = 'codex'`]
  const args: string[] = []
  if (query.type) {
    where.push(`json_extract(e.frontmatter, '$.codexType') = ?`)
    args.push(query.type)
  }
  if (query.tag) {
    where.push('e.id IN (SELECT entry_id FROM tags WHERE tag = ?)')
    args.push(query.tag)
  }
  if (query.q) {
    const fts = toFtsQuery(query.q)
    // Names/aliases match at the start of any word ("cartog" finds "The Cartographer").
    const name = query.q.toLowerCase().replace(/[\\%_]/g, char => `\\${char}`)
    where.push(`(e.id IN (SELECT entry_id FROM entry_names WHERE name LIKE ? ESCAPE '\\' OR name LIKE ? ESCAPE '\\')${fts ? ' OR e.id IN (SELECT id FROM entries_fts WHERE entries_fts MATCH ?)' : ''})`)
    args.push(`${name}%`, `% ${name}%`, ...(fts ? [fts] : []))
  }
  const result = await book.db.$client.execute({
    sql: `SELECT e.id, e.path, e.title, e.frontmatter, substr(f.body, 1, 160) AS excerpt,
            (SELECT json_group_array(tag) FROM tags t WHERE t.entry_id = e.id) AS tags
          FROM entries e JOIN entries_fts f ON f.id = e.id
          WHERE ${where.join(' AND ')} ORDER BY e.title COLLATE NOCASE`,
    args,
  })
  return result.rows.map(row => toSummary(row as Record<string, unknown>))
}

export async function codexType(book: BookContext, id: string): Promise<CodexTypeTemplate> {
  const type = (await listCodexTypes(book.root)).types.find(candidate => candidate.id === id)
  if (!type) throw new InvalidInputError(`Unknown codex type "${id}"`)
  return type
}

/** Creates an entry of a type in its folder (`codex/<folder>/<slug>.md`). */
export async function createCodexEntry(book: BookContext, input: { type: string, title: string }): Promise<{ id: string, path: string }> {
  const type = await codexType(book, input.type)
  const entry = await book.repository.create({ type: 'codex', dir: `codex/${type.folder}`, title: input.title, frontmatter: { codexType: type.id } })
  await applyChange(book.db, book.repository, { kind: 'added', path: entry.path })
  return { id: entry.frontmatter.id, path: entry.path }
}

export const UpdateCodexEntrySchema = z.object({
  path: z.string().min(1),
  fields: z.record(z.string(), z.union([z.string().max(20_000), z.array(z.string().max(500)).max(200), z.null()])).default({}),
  aliases: z.array(z.string().trim().min(1).max(200)).max(50).optional(),
})
export type UpdateCodexEntryInput = z.infer<typeof UpdateCodexEntrySchema>

/**
 * Updates template fields (validated against the entry's type) and aliases. `null` removes a field.
 * Frontmatter keys outside the template are preserved untouched.
 */
export async function updateCodexEntry(book: BookContext, input: UpdateCodexEntryInput, now = new Date()): Promise<EntryDocument> {
  const entry = await book.repository.read(input.path)
  if (entry.type !== 'codex') throw new NotFoundError(`Codex entry ${input.path}`)
  const frontmatter = entry.frontmatter as Record<string, unknown>
  const type = await codexType(book, String(frontmatter.codexType))
  const problems = validateFields(type, input.fields as Record<string, FieldValue>)
  if (problems.length) throw new InvalidInputError(problems.join('; '))
  const cleared = new Set(Object.entries(input.fields).filter(([, value]) => value === null || value === '').map(([key]) => key))
  const kept = Object.entries(frontmatter).filter(([key]) => !cleared.has(key))
  const set = Object.entries(input.fields).filter(([key]) => !cleared.has(key))
  const next = { ...Object.fromEntries(kept), ...Object.fromEntries(set), ...(input.aliases ? { aliases: input.aliases } : {}), updated: now.toISOString() }
  const saved = await book.repository.write(entry.path, { frontmatter: next as typeof entry.frontmatter, body: entry.body }, entry.hash)
  await applyChange(book.db, book.repository, { kind: 'changed', path: entry.path })
  return { id: saved.frontmatter.id, path: saved.path, type: saved.type, title: saved.frontmatter.title, body: saved.body, hash: saved.hash, frontmatter: saved.frontmatter }
}
