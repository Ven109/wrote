import { z } from 'zod'
import { ActorSchema } from './suggestion'
import { EntryIdSchema } from './entry'

/** A file as it was in a snapshot: its content hash, or `null` when it did not exist. */
export const SnapshotFileSchema = z.object({ path: z.string(), hash: z.string().nullable() })

export const SnapshotSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  name: z.string(),
  /** Taken automatically (before an AI bulk action or a restore). */
  auto: z.boolean(),
  /** What was snapshotted: the whole book, or one scene/chapter (then `entryId`/`title`). */
  scope: z.object({ kind: z.enum(['book', 'entry', 'files']), entryId: z.string().nullable(), title: z.string() }),
  files: z.array(SnapshotFileSchema),
  actor: ActorSchema,
  /** Words in the snapshotted Markdown. */
  words: z.number().int().nonnegative(),
  /** Commit made for the snapshot (git integration), if any. */
  commit: z.string().nullable().default(null),
})
export type Snapshot = z.infer<typeof SnapshotSchema>

/** List item: the snapshot without its file list. */
export type SnapshotSummary = Omit<Snapshot, 'files'> & { fileCount: number }

export const CreateSnapshotSchema = z.object({
  name: z.string().trim().min(1).max(120),
  /** A scene or chapter; omitted: the whole book. */
  entryId: EntryIdSchema.optional(),
})

export const SnapshotListQuerySchema = z.object({
  /** Only snapshots that contain this file. */
  path: z.string().max(500).optional(),
})

/** One file of a snapshot compared with now. */
export interface SnapshotFileDiff {
  path: string
  before: string | null
  after: string | null
  /** Current content hash, for conflict-safe restores. */
  currentHash: string | null
}

export const RestoreSnapshotSchema = z.object({
  /** Restore one file only (default: every file of the snapshot). */
  path: z.string().max(500).optional(),
  /** With `path`: only these blocks (indices into the block diff). */
  blocks: z.array(z.number().int().nonnegative()).max(10_000).optional(),
  /** With `path`: the file's hash when the diff was shown; a mismatch is a conflict. */
  expectedHash: z.string().nullable().optional(),
})
export type RestoreSnapshotInput = z.infer<typeof RestoreSnapshotSchema>
