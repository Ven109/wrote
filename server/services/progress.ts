import type { IndexDb } from '../db/client'

export interface BookProgress {
  totalWords: number
  scenes: number
  byStatus: Record<string, { scenes: number, words: number }>
  notes: number
  inbox: number
  codexEntries: number
}

/** Word counts and entry counts for a book, from the index. */
export async function getProgress(db: IndexDb): Promise<BookProgress> {
  const scenes = await db.$client.execute(`SELECT status, COUNT(*) AS n, SUM(word_count) AS words FROM entries WHERE type = 'scene' GROUP BY status`)
  const counts = await db.$client.execute(`SELECT
      SUM(type = 'note') AS notes,
      SUM(type = 'note' AND path LIKE 'notes/inbox/%') AS inbox,
      SUM(type = 'codex') AS codex
    FROM entries`)
  const byStatus: BookProgress['byStatus'] = {}
  let totalWords = 0
  let sceneCount = 0
  for (const row of scenes.rows) {
    const words = Number(row.words ?? 0)
    byStatus[String(row.status ?? 'draft')] = { scenes: Number(row.n), words }
    totalWords += words
    sceneCount += Number(row.n)
  }
  const c = counts.rows[0]!
  return { totalWords, scenes: sceneCount, byStatus, notes: Number(c.notes ?? 0), inbox: Number(c.inbox ?? 0), codexEntries: Number(c.codex ?? 0) }
}
