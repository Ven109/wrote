import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import type { StructureNode } from '#shared/schemas/manuscript'
import { locateNode, moveInTree, type NodeType } from '#shared/utils/manuscript-tree'
import { bookKeys } from '~/queries/keys'
import { structureQuery } from '~/queries/manuscript'

export interface MoveTarget {
  parentId: string | null
  index: number
}

/** The manuscript tree of a book with optimistic create/rename/move/delete. */
export function useManuscript(bookId: MaybeRefOrGetter<string>) {
  const queryCache = useQueryCache()
  const toast = useToast()
  const id = () => toValue(bookId)
  const base = () => `/api/books/${encodeURIComponent(id())}/structure`
  const key = () => bookKeys.structure(id())

  const { data, status, error, refresh } = useQuery(() => structureQuery(id()))
  const tree = computed(() => data.value ?? [])

  /** Applies an optimistic tree change and returns a rollback context. */
  function optimistic(update: (current: StructureNode[]) => StructureNode[] | null) {
    const previous = queryCache.getQueryData<StructureNode[]>(key())
    const next = previous && update(previous)
    if (next) queryCache.setQueryData(key(), next)
    return { previous }
  }
  const rollback = (error: unknown, context?: { previous?: StructureNode[] }) => {
    if (context?.previous) queryCache.setQueryData(key(), context.previous)
    toast.add({ title: 'Could not update the manuscript', description: apiErrorMessage(error), color: 'error' })
  }
  const settle = () => queryCache.invalidateQueries({ key: bookKeys.book(id()) })

  const { mutateAsync: createNode } = useMutation({
    mutation: (input: { type: NodeType, title: string, parentId?: string }) =>
      $fetch<{ id: string, path: string }>(base(), { method: 'POST', body: input }),
    onError: error => rollback(error),
    onSettled: settle,
  })

  const { mutateAsync: renameNode } = useMutation({
    mutation: ({ nodeId, title }: { nodeId: string, title: string }) =>
      $fetch(`${base()}/${nodeId}`, { method: 'PATCH', body: { title } }),
    onMutate: ({ nodeId, title }) => optimistic((current) => {
      const next = structuredClone(current)
      const found = locateNode(next, nodeId)
      if (!found) return null
      found.node.title = title
      return next
    }),
    onError: (error, _vars, context) => rollback(error, context),
    onSettled: settle,
  })

  const { mutateAsync: moveNode } = useMutation({
    mutation: ({ nodeId, target }: { nodeId: string, target: MoveTarget }) =>
      $fetch<StructureNode[]>(`${base()}/${nodeId}/move`, {
        method: 'POST',
        body: { parentId: target.parentId ?? undefined, index: target.index },
      }),
    onMutate: ({ nodeId, target }) => optimistic(current => moveInTree(current, nodeId, target.parentId, target.index)),
    onSuccess: structure => queryCache.setQueryData(key(), structure),
    onError: (error, _vars, context) => rollback(error, context),
    onSettled: settle,
  })

  const { mutateAsync: removeNode } = useMutation({
    mutation: (nodeId: string) => $fetch(`${base()}/${nodeId}`, { method: 'DELETE' }),
    onMutate: nodeId => optimistic((current) => {
      const next = structuredClone(current)
      const found = locateNode(next, nodeId)
      if (!found) return null
      found.siblings.splice(found.index, 1)
      return next
    }),
    onError: (error, _vars, context) => rollback(error, context),
    onSettled: settle,
  })

  return { tree, status, error, refresh, createNode, renameNode, moveNode, removeNode }
}
