import { CodexProposalSchema, type CodexProposal, type CodexProposalStatus } from '#shared/schemas/codex-proposals'
import type { StateDb } from './client'

const parse = (row: Record<string, unknown>) => CodexProposalSchema.parse(JSON.parse(String(row.data)))

export async function upsertCodexProposal(db: StateDb, proposal: CodexProposal): Promise<CodexProposal> {
  const parsed = CodexProposalSchema.parse(proposal)
  await db.$client.execute({
    sql: `INSERT INTO codex_proposals (id, source_entry_id, status, created_at, data) VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET status = excluded.status, data = excluded.data`,
    args: [parsed.id, parsed.sourceEntryId, parsed.status, parsed.createdAt, JSON.stringify(parsed)],
  })
  return parsed
}

export async function findCodexProposals(db: StateDb, filter: { status?: CodexProposalStatus, sourceEntryId?: string, id?: string } = {}): Promise<CodexProposal[]> {
  const where: string[] = []
  const args: string[] = []
  for (const [column, value] of [['status', filter.status], ['source_entry_id', filter.sourceEntryId], ['id', filter.id]] as const) {
    if (value === undefined) continue
    where.push(`${column} = ?`)
    args.push(value)
  }
  const result = await db.$client.execute({ sql: `SELECT data FROM codex_proposals ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at, rowid`, args })
  return result.rows.map(row => parse(row as Record<string, unknown>))
}

/** Drops pending proposals of a source before a new scan replaces them. */
export async function deletePendingCodexProposals(db: StateDb, sourceEntryId: string): Promise<void> {
  await db.$client.execute({ sql: `DELETE FROM codex_proposals WHERE source_entry_id = ? AND status = 'pending'`, args: [sourceEntryId] })
}
