import { OutlineProposalSchema, type OutlineProposal, type OutlineProposalStatus } from '#shared/schemas/outline-proposals'
import type { StateDb } from './client'

export async function upsertOutlineProposal(db: StateDb, proposal: OutlineProposal): Promise<OutlineProposal> {
  const parsed = OutlineProposalSchema.parse(proposal)
  await db.$client.execute({
    sql: `INSERT INTO outline_proposals (id, status, created_at, data) VALUES (?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET status = excluded.status, data = excluded.data`,
    args: [parsed.id, parsed.status, parsed.createdAt, JSON.stringify(parsed)],
  })
  return parsed
}

export async function findOutlineProposals(db: StateDb, filter: { status?: OutlineProposalStatus, id?: string } = {}): Promise<OutlineProposal[]> {
  const where: string[] = []
  const args: string[] = []
  for (const [column, value] of [['status', filter.status], ['id', filter.id]] as const) {
    if (value === undefined) continue
    where.push(`${column} = ?`)
    args.push(value)
  }
  const result = await db.$client.execute({ sql: `SELECT data FROM outline_proposals ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at, rowid`, args })
  return result.rows.map(row => OutlineProposalSchema.parse(JSON.parse(String(row.data))))
}
