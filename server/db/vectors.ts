import type { EntryType } from '#shared/schemas/entry'
import type { IndexDb } from './client'
import { filterClause, type SearchOptions } from './queries'

const MODEL_KEY = 'embedding_model'

export interface PendingChunk {
  hash: string
  text: string
}

export interface EmbeddingCoverage {
  /** Model reference that produced the stored vectors (`provider:model`), if any. */
  model: string | null
  /** Distinct chunks in the book. */
  total: number
  /** Distinct chunks that have a vector. */
  embedded: number
}

export interface ChunkHit {
  id: string
  path: string
  type: EntryType
  title: string
  text: string
  /** Cosine distance (0 = identical direction). */
  distance: number
}

const toBlob = (vector: number[]) => new Uint8Array(new Float32Array(vector).buffer)

export async function embeddingModel(db: IndexDb): Promise<string | null> {
  const result = await db.$client.execute({ sql: 'SELECT value FROM index_meta WHERE key = ?', args: [MODEL_KEY] })
  return result.rows[0] ? String(result.rows[0].value) : null
}

/** Switches the embedding model: vectors of another model are not comparable, so they are all dropped. */
export async function useEmbeddingModel(db: IndexDb, model: string): Promise<boolean> {
  if (await embeddingModel(db) === model) return false
  await db.$client.batch([
    'DELETE FROM embeddings',
    { sql: 'INSERT INTO index_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', args: [MODEL_KEY, model] },
  ], 'write')
  return true
}

/** Chunks without a vector yet (distinct by hash). */
export async function pendingChunks(db: IndexDb, limit: number): Promise<PendingChunk[]> {
  const result = await db.$client.execute({
    sql: `SELECT c.hash, MIN(c.text) AS text FROM chunks c LEFT JOIN embeddings e ON e.hash = c.hash
          WHERE e.hash IS NULL GROUP BY c.hash ORDER BY MIN(c.entry_id), MIN(c.seq) LIMIT ?`,
    args: [limit],
  })
  return result.rows.map(row => ({ hash: String(row.hash), text: String(row.text) }))
}

export async function storeEmbeddings(db: IndexDb, rows: { hash: string, vector: number[] }[]): Promise<void> {
  if (!rows.length) return
  await db.$client.batch(rows.map(row => ({ sql: 'INSERT OR REPLACE INTO embeddings (hash, vector) VALUES (?, ?)', args: [row.hash, toBlob(row.vector)] })), 'write')
}

/** Drops vectors whose chunk no longer exists (edited or deleted text). */
export async function pruneEmbeddings(db: IndexDb): Promise<number> {
  const result = await db.$client.execute('DELETE FROM embeddings WHERE hash NOT IN (SELECT hash FROM chunks)')
  return result.rowsAffected
}

export async function embeddingCoverage(db: IndexDb): Promise<EmbeddingCoverage> {
  const result = await db.$client.execute(`SELECT COUNT(DISTINCT c.hash) AS total, COUNT(DISTINCT e.hash) AS embedded
    FROM chunks c LEFT JOIN embeddings e ON e.hash = c.hash`)
  const row = result.rows[0]
  return { model: await embeddingModel(db), total: Number(row?.total ?? 0), embedded: Number(row?.embedded ?? 0) }
}

/**
 * Nearest chunks to a query vector by cosine distance (exact scan – a book has a few thousand chunks at
 * most, which libSQL scans in milliseconds). Filters match `searchEntries`.
 */
export async function nearestChunks(db: IndexDb, vector: number[], options: SearchOptions = {}): Promise<ChunkHit[]> {
  const filter = filterClause(options)
  const result = await db.$client.execute({
    sql: `SELECT e.id, e.path, e.type, e.title, c.text, vector_distance_cos(v.vector, ?) AS distance
          FROM embeddings v JOIN chunks c ON c.hash = v.hash JOIN entries e ON e.id = c.entry_id
          ${filter.sql ? `WHERE ${filter.sql}` : ''}
          ORDER BY distance LIMIT ?`,
    args: [toBlob(vector), ...filter.args, options.limit ?? 50],
  })
  return result.rows.map(row => ({
    id: String(row.id),
    path: String(row.path),
    type: String(row.type) as EntryType,
    title: String(row.title),
    text: String(row.text),
    distance: Number(row.distance),
  }))
}
