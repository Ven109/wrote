import type { CodexAppearance, CodexMentionTarget, CodexTypeTemplate } from '#shared/schemas/codex'
import { createNameMatcher } from '#shared/utils/name-matcher'
import { listCodexTypes } from '../codex/types'
import { listCodex } from './codex'
import type { BookContext } from './workspace'

const MAX_FACTS = 3

function factsFor(template: CodexTypeTemplate | undefined, frontmatter: Record<string, unknown>) {
  if (!template) return []
  return template.fields
    .filter(field => field.kind === 'text' || field.kind === 'select' || field.kind === 'list')
    .map(field => ({ label: field.label, value: Array.isArray(frontmatter[field.key]) ? (frontmatter[field.key] as string[]).join(', ') : String(frontmatter[field.key] ?? '') }))
    .filter(fact => fact.value.trim())
    .slice(0, MAX_FACTS)
}

/** Codex entries to detect in prose (excluding entries with `detect: false`), with hover-card data. */
export async function mentionTargets(book: BookContext): Promise<CodexMentionTarget[]> {
  const [entries, { types }, frontmatters] = await Promise.all([
    listCodex(book),
    listCodexTypes(book.root),
    book.db.$client.execute(`SELECT id, frontmatter FROM entries WHERE type = 'codex'`),
  ])
  const frontmatterById = new Map(frontmatters.rows.map(row => [String(row.id), JSON.parse(String(row.frontmatter)) as Record<string, unknown>]))
  return entries
    .filter(entry => frontmatterById.get(entry.id)?.detect !== false)
    .map(entry => ({
      id: entry.id,
      path: entry.path,
      title: entry.title,
      codexType: entry.codexType,
      names: [entry.title, ...entry.aliases],
      excerpt: entry.excerpt,
      facts: factsFor(types.find(type => type.id === entry.codexType), frontmatterById.get(entry.id) ?? {}),
    }))
}

/**
 * Scenes that mention a codex entry by title or alias, with counts, in manuscript order. Computed on demand
 * (full-text candidates, then exact word-bounded matching), so it is always current after edits and renames.
 */
export async function appearsIn(book: BookContext, entryId: string): Promise<CodexAppearance[]> {
  // entry_names also holds the id itself; only titles and aliases count as mentions.
  const namesResult = await book.db.$client.execute({ sql: 'SELECT name FROM entry_names WHERE entry_id = ? AND name != lower(entry_id)', args: [entryId] })
  const names = namesResult.rows.map(row => String(row.name)).filter(name => name.length >= 2)
  if (!names.length) return []
  const phrases = names.map(name => `"${name.replace(/"/g, '""')}"`).join(' OR ')
  const candidates = await book.db.$client.execute({
    sql: `SELECT e.id, e.path, e.title, f.body FROM entries_fts f JOIN entries e ON e.id = f.id
          WHERE entries_fts MATCH ? AND e.type = 'scene' ORDER BY e.path`,
    args: [`body: (${phrases})`],
  })
  const matcher = createNameMatcher(names.map(name => ({ name, entryId })))
  return candidates.rows
    .map(row => ({ id: String(row.id), path: String(row.path), title: String(row.title), count: matcher.find(String(row.body)).length }))
    .filter(appearance => appearance.count > 0)
}
