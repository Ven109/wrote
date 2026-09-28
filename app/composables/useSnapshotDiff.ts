import { useQuery, useQueryCache } from '@pinia/colada'
import type { SnapshotFileDiff } from '#shared/schemas/snapshot'
import { diffBlocks } from '#shared/utils/block-diff'
import { bookKeys } from '~/queries/keys'
import { snapshotDiffQuery } from '~/queries/snapshots'

export type DiffMode = 'side-by-side' | 'inline'

/**
 * Comparing a snapshot with now: the changed files as block diffs (side by side or inline), and restoring
 * the whole snapshot, one file or single blocks. Every restore can be undone from the toast (activity log).
 */
export function useSnapshotDiff(bookId: MaybeRefOrGetter<string>, snapshotId: MaybeRefOrGetter<string | null>) {
  const queryCache = useQueryCache()
  const toast = useToast()
  const mode = ref<DiffMode>('side-by-side')
  const busy = ref(false)
  const id = () => toValue(bookId)
  const { data, isPending, error } = useQuery(() => snapshotDiffQuery({ bookId: id(), snapshotId: toValue(snapshotId) ?? '' }))
  const files = computed(() => (data.value ?? []).map(file => ({ ...file, blocks: diffBlocks(file.before, file.after) })))

  async function undo(activityId: string) {
    await $fetch(`/api/books/${encodeURIComponent(id())}/activity/${activityId}/undo`, { method: 'POST', body: {} })
      .then(() => toast.add({ title: 'Restore undone', color: 'success' }))
      .catch(err => toast.add({ title: 'Could not undo', description: apiErrorMessage(err), color: 'error' }))
    await refresh()
  }

  const refresh = () => Promise.all([
    queryCache.invalidateQueries({ key: bookKeys.snapshots(id()) }),
    queryCache.invalidateQueries({ key: bookKeys.book(id()) }),
  ])

  async function restore(input: { path?: string, blocks?: number[], expectedHash?: string | null } = {}) {
    const snapshot = toValue(snapshotId)
    if (!snapshot) return
    busy.value = true
    try {
      const result = await $fetch<{ restored: string[], activity: { id: string } | null }>(`/api/books/${encodeURIComponent(id())}/snapshots/${snapshot}/restore`, { method: 'POST', body: input })
      toast.add(result.activity
        ? { title: `Restored ${result.restored.length === 1 ? result.restored[0]!.split('/').at(-1) : `${result.restored.length} files`}`, color: 'success', actions: [{ label: 'Undo', onClick: () => void undo(result.activity!.id) }] }
        : { title: 'Nothing to restore – already the same', color: 'neutral' })
    }
    catch (err) {
      toast.add({ title: 'Could not restore', description: apiErrorMessage(err), color: 'error' })
    }
    finally {
      busy.value = false
      await refresh()
    }
  }

  return {
    mode,
    files,
    isPending,
    error,
    busy,
    restoreAll: () => restore(),
    restoreFile: (file: SnapshotFileDiff) => restore({ path: file.path, expectedHash: file.currentHash }),
    restoreBlock: (file: SnapshotFileDiff, index: number) => restore({ path: file.path, blocks: [index], expectedHash: file.currentHash }),
  }
}
