import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { createClient, type Client } from '@libsql/client'
import type { AiCall, UsageGroup, UsageTotals } from '#shared/schemas/usage'
import { migrate } from './state/client'

/**
 * Workspace-wide AI usage log (`<workspace>/.wrote/usage.db`): one row per model call with tokens and
 * estimated cost. Workspace-level because budgets and API keys are; rows name their book.
 */
const USAGE_MIGRATIONS = [
  [
    `CREATE TABLE ai_calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      at TEXT NOT NULL,
      book_id TEXT,
      feature TEXT NOT NULL,
      model TEXT NOT NULL,
      input_tokens INTEGER NOT NULL,
      output_tokens INTEGER NOT NULL,
      cached_tokens INTEGER NOT NULL,
      cost REAL
    )`,
    'CREATE INDEX ai_calls_at_idx ON ai_calls(at)',
  ],
]

const clients = new Map<string, Promise<Client>>()

async function open(workspaceDir: string): Promise<Client> {
  const dir = join(workspaceDir, '.wrote')
  await mkdir(dir, { recursive: true })
  const client = createClient({ url: `file:${join(dir, 'usage.db')}` })
  await client.execute('PRAGMA journal_mode = WAL')
  await migrate(client, USAGE_MIGRATIONS)
  return client
}

export function usageDb(workspaceDir: string): Promise<Client> {
  let client = clients.get(workspaceDir)
  if (!client) {
    client = open(workspaceDir)
    clients.set(workspaceDir, client)
    client.catch(() => clients.delete(workspaceDir))
  }
  return client
}

export async function closeUsageDbs(): Promise<void> {
  const all = [...clients.values()]
  clients.clear()
  await Promise.all(all.map(async client => (await client.catch(() => null))?.close()))
}

export async function insertCall(db: Client, call: AiCall): Promise<void> {
  await db.execute({
    sql: 'INSERT INTO ai_calls (at, book_id, feature, model, input_tokens, output_tokens, cached_tokens, cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    args: [call.at, call.bookId, call.feature, call.model, call.inputTokens, call.outputTokens, call.cachedTokens, call.cost],
  })
}

/** Estimated spend (USD) since an ISO timestamp. */
export async function spentSince(db: Client, since: string): Promise<number> {
  const result = await db.execute({ sql: 'SELECT COALESCE(SUM(cost), 0) AS spent FROM ai_calls WHERE at >= ?', args: [since] })
  return Number(result.rows[0]?.spent ?? 0)
}

const TOTALS = `COUNT(*) AS calls, SUM(input_tokens) AS input, SUM(output_tokens) AS output, SUM(cached_tokens) AS cached,
  COALESCE(SUM(cost), 0) AS cost, SUM(CASE WHEN cost IS NULL THEN 1 ELSE 0 END) AS unpriced`

function totals(row: Record<string, unknown> | undefined): UsageTotals {
  const n = (key: string) => Number(row?.[key] ?? 0)
  return { calls: n('calls'), inputTokens: n('input'), outputTokens: n('output'), cachedTokens: n('cached'), cost: n('cost'), unpriced: n('unpriced') }
}

export type UsageDimension = 'feature' | 'model' | 'book' | 'month'
const COLUMN: Record<UsageDimension, string> = { feature: 'feature', model: 'model', book: `COALESCE(book_id, '')`, month: 'substr(at, 1, 7)' }

/** Usage since `since` (optionally of one book), in total or grouped by one dimension (largest cost first; months in order). */
export async function usageTotals(db: Client, since: string, bookId?: string): Promise<UsageTotals> {
  const result = await db.execute({ sql: `SELECT ${TOTALS} FROM ai_calls WHERE at >= ? AND (? IS NULL OR book_id = ?)`, args: [since, bookId ?? null, bookId ?? null] })
  return totals(result.rows[0] as Record<string, unknown> | undefined)
}

export async function usageBy(db: Client, dimension: UsageDimension, since: string, bookId?: string): Promise<UsageGroup[]> {
  const order = dimension === 'month' ? 'key' : 'cost DESC, input + output DESC'
  const result = await db.execute({
    sql: `SELECT ${COLUMN[dimension]} AS key, ${TOTALS} FROM ai_calls WHERE at >= ? AND (? IS NULL OR book_id = ?) GROUP BY key ORDER BY ${order}`,
    args: [since, bookId ?? null, bookId ?? null],
  })
  return result.rows.map((row) => {
    const record = row as Record<string, unknown>
    return { key: String(record.key), label: String(record.key), ...totals(record) }
  })
}
