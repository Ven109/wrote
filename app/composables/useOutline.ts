import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import type { OutlineDocument, OutlineOp } from '#shared/schemas/outline'
import { createRecordId } from '#shared/utils/ids'
import { applyOutlineOps } from '#shared/utils/outline-ops'
import { bookKeys } from '~/queries/keys'
import { outlineQuery } from '~/queries/outline'

const isConflict = (error: unknown) => (error as { statusCode?: number } | null)?.statusCode === 409

/** Gives new acts and beats their id on the client, so optimistic and saved outlines match. */
function withIds(ops: OutlineOp[]): OutlineOp[] {
  return ops.map(op => (op.op === 'addAct' && !op.id ? { ...op, id: createRecordId('act', 10) } : op.op === 'addBeat' && !op.id ? { ...op, id: createRecordId('bt', 10) } : op))
}

/**
 * The book's outline (acts → beats) with optimistic edits: the tree and the board apply the same pure
 * operations locally at once; saves run one after another, each against the hash of the previous save, so
 * quick successive drags never conflict with themselves. A real conflict (edited elsewhere) reloads.
 */
export function useOutline(bookId: MaybeRefOrGetter<string>) {
  const queryCache = useQueryCache()
  const toast = useToast()
  const key = () => bookKeys.outline(toValue(bookId))
  const { data, status, error } = useQuery(() => outlineQuery(toValue(bookId)))
  const outline = computed(() => data.value?.outline ?? { notes: '', acts: [] })
  let savedHash: string | undefined
  let pending = 0
  let queue: Promise<unknown> = Promise.resolve()
  watch(data, (value) => {
    if (!pending) savedHash = value?.hash
  }, { immediate: true })

  const { mutateAsync } = useMutation({
    mutation: (ops: OutlineOp[]) =>
      $fetch<OutlineDocument>(`/api/books/${encodeURIComponent(toValue(bookId))}/outline/ops`, { method: 'POST', body: { ops, expectedHash: savedHash } }),
    onSuccess: (saved) => {
      savedHash = saved.hash
      // Later edits are already shown optimistically; only the last save replaces the cache.
      if (pending === 1) queryCache.setQueryData(key(), saved)
    },
    onError: (err) => {
      toast.add(isConflict(err)
        ? { title: 'The outline was changed elsewhere', description: 'It has been reloaded – please try again.', color: 'warning' }
        : { title: 'Could not update the outline', description: apiErrorMessage(err), color: 'error' })
      void queryCache.invalidateQueries({ key: key() })
    },
  })

  /** Applies edits at once (optimistic) and queues their save. */
  function apply(...ops: OutlineOp[]): Promise<unknown> {
    const edits = withIds(ops)
    const current = queryCache.getQueryData<OutlineDocument>(key())
    try {
      if (current) queryCache.setQueryData(key(), { ...current, outline: applyOutlineOps(current.outline, edits, prefix => createRecordId(prefix, 10)) })
    }
    catch {
      // Stale ids (changed elsewhere): the server rejects the edit and the outline reloads.
    }
    pending++
    queue = queue.then(() => mutateAsync(edits)).catch(() => undefined).finally(() => pending--)
    return queue
  }

  return { outline, status, error, apply }
}
