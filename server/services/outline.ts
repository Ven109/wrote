import { BOOK_LAYOUT } from '#shared/book/layout'
import type { OutlineDocument, OutlineOp } from '#shared/schemas/outline'
import { createId, createRecordId } from '#shared/utils/ids'
import { ensureOutlineIds, parseOutline, serializeOutline } from '#shared/utils/outline-format'
import { applyOutlineOps as applyOps, OutlineOpError } from '#shared/utils/outline-ops'
import { applyChange } from '../db/indexer'
import { ConflictError, InvalidInputError } from '../storage/errors'
import type { StoredEntry } from '../storage/entries'
import type { BookContext } from './workspace'

const PATH = BOOK_LAYOUT.outline
const newId = (prefix: 'act' | 'bt') => createRecordId(prefix, 10)

async function readEntry(book: BookContext): Promise<StoredEntry | null> {
  return book.repository.read(PATH).catch(() => null)
}

async function save(book: BookContext, entry: StoredEntry | null, body: string): Promise<StoredEntry> {
  const frontmatter = entry?.frontmatter ?? { id: createId('outline'), title: 'Outline', tags: [] }
  const saved = await book.repository.write(PATH, { frontmatter, body }, entry?.hash)
  await applyChange(book.db, book.repository, { kind: 'changed', path: PATH })
  return saved
}

/** The outline, parsed from `outline.md`. Hand-written acts and beats get ids on first read (saved). */
export async function readOutline(book: BookContext): Promise<OutlineDocument> {
  let entry = await readEntry(book)
  const outline = parseOutline(entry?.body ?? '')
  if (entry && ensureOutlineIds(outline, newId)) entry = await save(book, entry, serializeOutline(outline))
  return { outline, hash: entry?.hash ?? '' }
}

/**
 * Applies structural edits and writes `outline.md` back in the canonical format. With `expectedHash`,
 * edits made to the file in the meantime are a conflict instead of being overwritten.
 */
export async function updateOutline(book: BookContext, ops: OutlineOp[], expectedHash?: string): Promise<OutlineDocument> {
  const current = await readOutline(book)
  if (expectedHash !== undefined && expectedHash !== current.hash) throw new ConflictError(PATH)
  let next
  try {
    next = applyOps(current.outline, ops, newId)
  }
  catch (error) {
    if (error instanceof OutlineOpError) throw new InvalidInputError(error.message)
    throw error
  }
  const saved = await save(book, await readEntry(book), serializeOutline(next))
  return { outline: next, hash: saved.hash }
}

export interface IndexedBeat {
  id: string
  title: string
  summary: string
  actId: string
  actTitle: string
  scenes: string[]
}

/** Beats from the index – all of them, or the ones a scene tells. */
export async function listBeats(book: BookContext, filter: { sceneId?: string } = {}): Promise<IndexedBeat[]> {
  const rows = await book.db.$client.execute({
    sql: `SELECT b.id, b.title, b.summary, b.act_id, b.act_title,
            (SELECT json_group_array(scene_id) FROM (SELECT scene_id FROM beat_scenes s WHERE s.beat_id = b.id ORDER BY s.position)) AS scenes
          FROM beats b ${filter.sceneId ? 'WHERE b.id IN (SELECT beat_id FROM beat_scenes WHERE scene_id = ?)' : ''} ORDER BY b.position`,
    args: filter.sceneId ? [filter.sceneId] : [],
  })
  return rows.rows.map(row => ({ id: String(row.id), title: String(row.title), summary: String(row.summary), actId: String(row.act_id), actTitle: String(row.act_title), scenes: JSON.parse(String(row.scenes)) as string[] }))
}
