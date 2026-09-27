import { BOOK_CONFIG_FILE } from '#shared/schemas/book'
import type { ActivityEntry, ActivityFilter, FileChange } from '#shared/schemas/activity'
import type { ToolPermissionLevel } from '#shared/schemas/permissions'
import type { Actor } from '#shared/schemas/suggestion'
import { createRecordId } from '#shared/utils/ids'
import { findActivity, listActivity as findActivities, upsertActivity } from '../db/state/activity'
import { InvalidInputError, NotFoundError, StorageError } from '../storage/errors'
import type { BookRepository } from '../storage/repository'
import { publishActivityEvent } from '../utils/book-events'
import type { BookContext } from './workspace'

/** The author, as the actor of undos made in the app. */
export const AUTHOR: Actor = { kind: 'user', name: 'You' }

export class UndoConflictError extends StorageError {
  constructor(readonly paths: string[]) {
    super(`Changed since: ${paths.join(', ')}. Undoing would discard those edits.`, 'conflict')
  }
}

/**
 * Wraps a repository so every file a tool touches is snapshotted before its first change; `changes()` then
 * returns the before/after states. Moves, trashing and reordering are not restorable from file states and
 * mark the call as not undoable.
 */
export function recordChanges(repository: BookRepository) {
  const before = new Map<string, string | null>()
  let undoable = true
  const touch = async (path: string) => {
    if (!before.has(path)) before.set(path, await repository.readRaw(path))
  }
  const untracked = <A extends unknown[], R>(fn: (...args: A) => Promise<R>) => (...args: A) => {
    undoable = false
    return fn(...args)
  }
  const recorded: BookRepository = {
    ...repository,
    write: async (path, content, expectedHash) => {
      await touch(path)
      return repository.write(path, content, expectedHash)
    },
    create: async (input) => {
      const entry = await repository.create(input)
      if (!before.has(entry.path)) before.set(entry.path, null)
      return entry
    },
    writeConfig: async (config) => {
      await touch(BOOK_CONFIG_FILE)
      return repository.writeConfig(config)
    },
    restoreRaw: async (path, content) => {
      await touch(path)
      return repository.restoreRaw(path, content)
    },
    move: untracked(repository.move),
    trash: untracked(repository.trash),
    reorder: untracked(repository.reorder),
  }
  async function changes(): Promise<FileChange[]> {
    const all = await Promise.all([...before].map(async ([path, previous]) => ({ path, before: previous, after: await repository.readRaw(path) })))
    return all.filter(change => change.before !== change.after)
  }
  return { repository: recorded, changes, undoable: () => undoable }
}

export interface ToolCallRecord {
  actor: Actor
  tool: string
  toolTitle: string
  permission: ToolPermissionLevel
  input: unknown
  output?: unknown
  changes: FileChange[]
  undoable: boolean
}

async function save(book: BookContext, entry: ActivityEntry): Promise<ActivityEntry> {
  const saved = await upsertActivity(book.state, entry)
  publishActivityEvent(book.id, { entry: saved })
  return saved
}

export function recordToolCall(book: BookContext, record: ToolCallRecord, now = new Date()): Promise<ActivityEntry> {
  return save(book, { ...record, id: createRecordId('act', 10), createdAt: now.toISOString(), undoneAt: null, undoOf: null, undoable: record.undoable && record.changes.length > 0 })
}

export const listActivity = (book: BookContext, filter: ActivityFilter) => findActivities(book.state, filter)

/**
 * Reverts a logged call by restoring every file to its before-state. Files edited since are conflicts:
 * nothing is changed unless `force` is set. The undo is logged as its own entry.
 */
export async function undoActivity(book: BookContext, id: string, options: { force?: boolean, actor?: Actor } = {}, now = new Date()): Promise<{ entry: ActivityEntry, undo: ActivityEntry }> {
  const entry = await findActivity(book.state, id)
  if (!entry) throw new NotFoundError(`Activity ${id}`)
  if (entry.undoneAt) throw new InvalidInputError('This change was already undone')
  if (!entry.undoable) throw new InvalidInputError('This change cannot be undone')
  const current = await Promise.all(entry.changes.map(change => book.repository.readRaw(change.path)))
  const conflicts = entry.changes.filter((change, i) => current[i] !== change.after).map(change => change.path)
  if (conflicts.length && !options.force) throw new UndoConflictError(conflicts)
  for (const change of entry.changes) await book.repository.restoreRaw(change.path, change.before)
  await book.settle()
  const undone = await save(book, { ...entry, undoneAt: now.toISOString() })
  const undo = await save(book, {
    id: createRecordId('act', 10),
    createdAt: now.toISOString(),
    actor: options.actor ?? AUTHOR,
    tool: 'undo',
    toolTitle: `Undo: ${entry.toolTitle}`,
    permission: entry.permission,
    input: { activityId: entry.id },
    changes: entry.changes.map((change, i) => ({ path: change.path, before: current[i] ?? null, after: change.before })),
    undoable: false,
    undoneAt: null,
    undoOf: entry.id,
  })
  return { entry: undone, undo }
}
