import { defineQueryOptions } from '@pinia/colada'
import type { SnapshotFileDiff, SnapshotSummary } from '#shared/schemas/snapshot'
import { bookKeys } from './keys'

const base = (bookId: string) => `/api/books/${encodeURIComponent(bookId)}/snapshots`

/** Snapshots of a book (all, or those holding `path`), newest first. */
export const snapshotsQuery = defineQueryOptions(({ bookId, path }: { bookId: string, path: string }) => ({
  key: bookKeys.snapshotList(bookId, path),
  query: () => $fetch<SnapshotSummary[]>(base(bookId), { query: path ? { path } : {} }),
  enabled: Boolean(bookId),
}))

/** The files of a snapshot that differ from now. */
export const snapshotDiffQuery = defineQueryOptions(({ bookId, snapshotId }: { bookId: string, snapshotId: string }) => ({
  key: bookKeys.snapshotDiff(bookId, snapshotId),
  query: () => $fetch<SnapshotFileDiff[]>(`${base(bookId)}/${snapshotId}/diff`),
  enabled: Boolean(bookId && snapshotId),
}))
