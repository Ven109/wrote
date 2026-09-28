import type { ActivityEntry, FileChange } from '#shared/schemas/activity'
import type { RestoreSnapshotInput, Snapshot } from '#shared/schemas/snapshot'
import type { Actor } from '#shared/schemas/suggestion'
import { applyBlockRestore, diffBlocks } from '#shared/utils/block-diff'
import { listBookTextFiles } from '../storage/entries'
import { ConflictError, InvalidInputError, NotFoundError } from '../storage/errors'
import { hashContent } from '../storage/fs'
import { AUTHOR, recordChanges, recordToolCall } from './activity'
import { requireSnapshot, saveSnapshot, snapshotContent } from './snapshots'
import type { BookContext } from './workspace'

export interface RestoreResult {
  /** Files changed by the restore. */
  restored: string[]
  /** The activity entry of the restore (undo it there). */
  activity: ActivityEntry | null
  /** Automatic snapshot of the files as they were right before the restore. */
  safety: Snapshot | null
}

/** What each file should contain after the restore (whole snapshot, one file, or some blocks of one file). */
async function restoreTargets(book: BookContext, snapshot: Snapshot, input: RestoreSnapshotInput): Promise<Map<string, string | null>> {
  if (!input.path) {
    const targets = new Map(await Promise.all(snapshot.files.map(async file => [file.path, await snapshotContent(book, file)] as const)))
    // A whole-book snapshot also removes files created since (restorable from the safety snapshot and undo).
    if (snapshot.scope.kind === 'book') {
      for (const path of await listBookTextFiles(book.repository.root)) if (!targets.has(path)) targets.set(path, null)
    }
    return targets
  }
  const file = snapshot.files.find(candidate => candidate.path === input.path)
  if (!file) throw new NotFoundError(`${input.path} in snapshot ${snapshot.id}`)
  const [before, current] = await Promise.all([snapshotContent(book, file), book.repository.readRaw(file.path)])
  if (input.expectedHash !== undefined && (current === null ? null : hashContent(current)) !== input.expectedHash) throw new ConflictError(file.path)
  if (!input.blocks) return new Map([[file.path, before]])
  const changes = diffBlocks(before, current)
  if (input.blocks.some(index => index >= changes.length)) throw new InvalidInputError('Unknown block – reload the comparison')
  const restored = applyBlockRestore(changes, new Set(input.blocks))
  return new Map([[file.path, restored || (before === null ? null : '')]])
}

/**
 * Restores a snapshot – all of it, one file, or chosen blocks of one file. The current state of the affected
 * files is snapshotted first, and the restore is logged in the activity log, so it can itself be undone.
 */
export async function restoreSnapshot(book: BookContext, id: string, input: RestoreSnapshotInput = {}, actor: Actor = AUTHOR, now = new Date()): Promise<RestoreResult> {
  const snapshot = await requireSnapshot(book, id)
  const targets = await restoreTargets(book, snapshot, input)
  const current = new Map(await Promise.all([...targets.keys()].map(async path => [path, await book.repository.readRaw(path)] as const)))
  const changed = [...targets].filter(([path, content]) => current.get(path) !== content)
  if (!changed.length) return { restored: [], activity: null, safety: null }

  const safety = await saveSnapshot(book, {
    name: `Before restoring "${snapshot.name}"`,
    scope: { kind: 'files', entryId: snapshot.scope.entryId, title: snapshot.scope.title },
    contents: new Map(changed.map(([path]) => [path, current.get(path) ?? null])),
    auto: true,
    actor,
    now,
  })
  const recorder = recordChanges(book.repository)
  for (const [path, content] of changed) await recorder.repository.restoreRaw(path, content)
  await book.settle()
  const title = input.path ? `Restore ${input.blocks ? `${input.blocks.length} block(s) of ` : ''}${input.path} from "${snapshot.name}"` : `Restore snapshot "${snapshot.name}"`
  const activity = await recordToolCall(book, { actor, tool: 'restore_snapshot', toolTitle: title, permission: 'write', input: { snapshotId: id, ...input }, changes: await recorder.changes(), undoable: recorder.undoable() }, now)
  return { restored: changed.map(([path]) => path), activity, safety }
}

/** Whether an AI change is a bulk action: several files, or several blocks of one file. */
export function isBulkChange(changes: FileChange[]): boolean {
  if (changes.length > 1) return true
  const [change] = changes
  return change !== undefined && diffBlocks(change.before, change.after).filter(block => block.kind !== 'same').length > 1
}

/**
 * Auto-labelled snapshot of the files an AI bulk action changed, as they were before it (the recorder kept
 * their before-states). Small edits (one block) are covered by the activity log alone.
 */
export async function snapshotBeforeBulkChange(book: BookContext, changes: FileChange[], label: string, actor: Actor): Promise<Snapshot | null> {
  if (!isBulkChange(changes)) return null
  return saveSnapshot(book, {
    name: `Before ${label} (${actor.name})`,
    scope: { kind: 'files', entryId: null, title: `${changes.length} file${changes.length === 1 ? '' : 's'}` },
    contents: new Map(changes.map(change => [change.path, change.before])),
    auto: true,
    actor,
  })
}
