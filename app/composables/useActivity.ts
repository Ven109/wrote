import { useQuery, useQueryCache } from '@pinia/colada'
import type { ActivityEntry } from '#shared/schemas/activity'
import { activityQuery } from '~/queries/activity'
import { bookKeys } from '~/queries/keys'
import { activityQueryFilter, mergeToolNames, type ActivityFilterForm } from '~/utils/activity'

const isConflict = (error: unknown) => (error as { statusCode?: number } | null)?.statusCode === 409

/**
 * The book's activity log: every AI/MCP tool call that changed data, filterable by actor, tool and time,
 * with one-click undo. An undo that would discard later edits asks first (`conflict`).
 */
export function useActivity(bookId: MaybeRefOrGetter<string>) {
  const queryCache = useQueryCache()
  const toast = useToast()
  const filters = reactive<ActivityFilterForm>({ actor: 'all', tool: 'all', range: 'all' })
  const { data, isPending, error } = useQuery(() => activityQuery({ bookId: toValue(bookId), filter: activityQueryFilter(filters) }))
  const entries = computed(() => data.value ?? [])
  const tools = ref<string[]>([])
  watch(entries, (value) => {
    tools.value = mergeToolNames(tools.value, value)
  }, { immediate: true })

  const expanded = ref<string | null>(null)
  const undoing = ref<string | null>(null)
  /** An undo refused because files were edited since; confirming forces it. */
  const conflict = ref<{ entry: ActivityEntry, message: string } | null>(null)

  async function undo(entry: ActivityEntry, force = false) {
    undoing.value = entry.id
    try {
      await $fetch(`/api/books/${encodeURIComponent(toValue(bookId))}/activity/${entry.id}/undo`, { method: 'POST', body: { force } })
      conflict.value = null
      toast.add({ title: 'Change undone', description: entry.toolTitle, color: 'success' })
    }
    catch (error) {
      if (isConflict(error) && !force) conflict.value = { entry, message: apiErrorMessage(error) }
      else toast.add({ title: 'Could not undo', description: apiErrorMessage(error), color: 'error' })
    }
    finally {
      undoing.value = null
      void queryCache.invalidateQueries({ key: bookKeys.activity(toValue(bookId)) })
    }
  }

  return {
    filters,
    entries,
    tools,
    isPending,
    error,
    expanded,
    undoing,
    conflict,
    toggle: (id: string) => (expanded.value = expanded.value === id ? null : id),
    undo: (entry: ActivityEntry) => undo(entry),
    forceUndo: () => conflict.value && undo(conflict.value.entry, true),
    dismissConflict: () => (conflict.value = null),
  }
}
