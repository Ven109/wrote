import type { EntryType } from '#shared/schemas/entry'
import { linkContext, renameWikiLinks } from '#shared/utils/links'
import { applyChange } from '../db/indexer'
import type { Backlink, LinkRef } from '#shared/schemas/links'
import { backlinks } from '../db/queries'
import type { BookContext } from './workspace'

const LINKABLE_TYPES: EntryType[] = ['scene', 'chapter', 'part', 'note', 'codex', 'research']

const toRef = (row: Record<string, unknown>): LinkRef => ({
  id: String(row.id),
  path: String(row.path),
  type: String(row.type) as EntryType,
  title: String(row.title),
})

/** Resolves link targets (id, title or alias; case-insensitive) to entries. Unknown targets map to `null`. */
export async function resolveTargets(book: BookContext, targets: string[]): Promise<Record<string, LinkRef | null>> {
  const unique = [...new Set(targets)]
  const resolved: Record<string, LinkRef | null> = Object.fromEntries(unique.map(target => [target, null]))
  if (!unique.length) return resolved
  const result = await book.db.$client.execute({
    sql: `SELECT n.name, e.id, e.path, e.type, e.title FROM entry_names n JOIN entries e ON e.id = n.entry_id
          WHERE n.name IN (${unique.map(() => '?').join(', ')})`,
    args: unique.map(target => target.trim().toLowerCase()),
  })
  const byName = new Map(result.rows.map(row => [String(row.name), toRef(row)]))
  for (const target of unique) resolved[target] = byName.get(target.trim().toLowerCase()) ?? null
  return resolved
}

/** Everything that can be linked to, for the `[[` picker. */
export async function listLinkables(book: BookContext): Promise<LinkRef[]> {
  const result = await book.db.$client.execute({
    sql: `SELECT id, path, type, title FROM entries WHERE type IN (${LINKABLE_TYPES.map(() => '?').join(', ')}) ORDER BY title`,
    args: LINKABLE_TYPES,
  })
  return result.rows.map(toRef)
}

async function namesOf(book: BookContext, entryId: string): Promise<string[]> {
  const result = await book.db.$client.execute({ sql: 'SELECT name FROM entry_names WHERE entry_id = ?', args: [entryId] })
  return result.rows.map(row => String(row.name))
}

/** Entries linking to `entryId`, each with a snippet around the link. */
export async function backlinksWithContext(book: BookContext, entryId: string): Promise<Backlink[]> {
  const [refs, names] = await Promise.all([backlinks(book.db, entryId), namesOf(book, entryId)])
  return Promise.all(refs.map(async (ref) => {
    const body = await book.db.$client.execute({ sql: 'SELECT body FROM entries_fts WHERE id = ?', args: [ref.id] })
    return { ...ref, context: linkContext(String(body.rows[0]?.body ?? ''), names) }
  }))
}

/**
 * After `entryId` was renamed from `oldTitle` to `newTitle`, rewrites `[[oldTitle]]` links across the book.
 * Skipped when another entry still answers to the old name (the links stay valid for it).
 */
export async function updateLinksForRename(book: BookContext, entryId: string, oldTitle: string, newTitle: string): Promise<LinkRef[]> {
  const oldName = oldTitle.trim().toLowerCase()
  if (!oldName || oldName === newTitle.trim().toLowerCase()) return []
  const owner = await book.db.$client.execute({ sql: 'SELECT 1 FROM entry_names WHERE name = ? AND entry_id != ?', args: [oldName, entryId] })
  if (owner.rows.length) return []
  const sources = await book.db.$client.execute({
    sql: `SELECT DISTINCT e.id, e.path, e.type, e.title FROM links l JOIN entries e ON e.id = l.source_id WHERE l.target = ?`,
    args: [oldName],
  })
  const updated: LinkRef[] = []
  for (const ref of sources.rows.map(toRef)) {
    const entry = await book.repository.read(ref.path)
    const { markdown, count } = renameWikiLinks(entry.body, oldTitle, newTitle)
    if (!count) continue
    await book.repository.write(entry.path, { frontmatter: entry.frontmatter, body: markdown }, entry.hash)
    await applyChange(book.db, book.repository, { kind: 'changed', path: entry.path })
    updated.push(ref)
  }
  return updated
}
