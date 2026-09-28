import { useQuery, useQueryCache } from '@pinia/colada'
import type { SnapshotSummary } from '#shared/schemas/snapshot'
import { findNodeByPath, pathToNode } from '#shared/utils/manuscript-tree'
import { bookKeys } from '~/queries/keys'
import { snapshotsQuery } from '~/queries/snapshots'

export interface SnapshotScopeOption {
  label: string
  value: string
  entryId?: string
}

/**
 * The snapshots page: snapshots of the book (or of the document in `path`), the selected one, and taking
 * or deleting snapshots. Scopes offered: the whole book, plus the scene and chapter of `path`.
 */
export function useSnapshots(bookId: MaybeRefOrGetter<string>, path: MaybeRefOrGetter<string>) {
  const queryCache = useQueryCache()
  const toast = useToast()
  const id = () => toValue(bookId)
  const { data, isPending, error } = useQuery(() => snapshotsQuery({ bookId: id(), path: toValue(path) }))
  const snapshots = computed(() => data.value ?? [])
  const selectedId = ref<string | null>(null)
  const selected = computed(() => snapshots.value.find(snapshot => snapshot.id === selectedId.value) ?? null)
  const { tree } = useManuscript(id)

  const scopes = computed<SnapshotScopeOption[]>(() => {
    const node = toValue(path) ? findNodeByPath(tree.value, toValue(path)) : null
    const chain = node ? pathToNode(tree.value, node.id).filter(step => step.type !== 'part').reverse() : []
    return [
      ...chain.map(step => ({ label: `${step.type === 'scene' ? 'Scene' : 'Chapter'}: ${step.title}`, value: step.id, entryId: step.id })),
      { label: 'Whole book', value: 'book' },
    ]
  })

  const refresh = () => queryCache.invalidateQueries({ key: bookKeys.snapshots(id()) })

  async function take(name: string, scope: string) {
    try {
      const entryId = scopes.value.find(option => option.value === scope)?.entryId
      const snapshot = await $fetch<SnapshotSummary>(`/api/books/${encodeURIComponent(id())}/snapshots`, { method: 'POST', body: { name, entryId } })
      toast.add({ title: `Snapshot "${name}" taken`, description: snapshot.commit ? `Committed to git (${snapshot.commit.slice(0, 7)})` : undefined, color: 'success' })
      selectedId.value = snapshot.id
    }
    catch (err) {
      toast.add({ title: 'Could not take the snapshot', description: apiErrorMessage(err), color: 'error' })
    }
    finally {
      await refresh()
    }
  }

  async function remove(snapshotId: string) {
    await $fetch(`/api/books/${encodeURIComponent(id())}/snapshots/${snapshotId}`, { method: 'DELETE' })
      .catch(err => toast.add({ title: 'Could not delete the snapshot', description: apiErrorMessage(err), color: 'error' }))
    if (selectedId.value === snapshotId) selectedId.value = null
    await refresh()
  }

  return { snapshots, isPending, error, selectedId, selected, scopes, take, remove }
}
