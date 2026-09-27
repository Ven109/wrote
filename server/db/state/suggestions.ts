import { SuggestionSchema, type Suggestion, type SuggestionStatus } from '#shared/schemas/suggestion'
import type { StateDb } from './client'

const parse = (row: Record<string, unknown>) => SuggestionSchema.parse(JSON.parse(String(row.data)))

export async function upsertSuggestion(db: StateDb, suggestion: Suggestion): Promise<Suggestion> {
  const parsed = SuggestionSchema.parse(suggestion)
  await db.$client.execute({
    sql: `INSERT INTO suggestions (id, entry_id, status, created_at, data) VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET status = excluded.status, data = excluded.data`,
    args: [parsed.id, parsed.entryId, parsed.status, parsed.createdAt, JSON.stringify(parsed)],
  })
  return parsed
}

export async function findSuggestions(db: StateDb, filter: { entryId?: string, status?: SuggestionStatus, ids?: string[] } = {}): Promise<Suggestion[]> {
  const where: string[] = []
  const args: string[] = []
  if (filter.entryId) {
    where.push('entry_id = ?')
    args.push(filter.entryId)
  }
  if (filter.status) {
    where.push('status = ?')
    args.push(filter.status)
  }
  if (filter.ids) {
    where.push(`id IN (${filter.ids.map(() => '?').join(', ') || '\'\''})`)
    args.push(...filter.ids)
  }
  const result = await db.$client.execute({ sql: `SELECT data FROM suggestions ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at, id`, args })
  return result.rows.map(row => parse(row as Record<string, unknown>))
}
