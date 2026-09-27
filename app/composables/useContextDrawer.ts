import { useQuery } from '@pinia/colada'
import type { ContextOverrides } from '#shared/schemas/context'
import { contextSnapshotQuery } from '~/queries/chat'
import { contextGroups, omittedRows, sameOverrides, toggleId } from '~/utils/context-items'

interface AssistantContextControls {
  overrides: Ref<ContextOverrides> | ComputedRef<ContextOverrides>
  rerun: (next: ContextOverrides) => Promise<void>
}

/**
 * The context drawer of an assistant answer: shows exactly what was sent (the stored snapshot), lets the
 * author pin or remove items and answer again with those changes.
 */
export function useContextDrawer(bookId: MaybeRefOrGetter<string>, assistant: AssistantContextControls) {
  const open = ref(false)
  const snapshotId = ref('')
  const draft = ref<ContextOverrides>({ pinned: [], removed: [] })
  const { data: snapshot, status } = useQuery(() => contextSnapshotQuery({ bookId: toValue(bookId), snapshotId: snapshotId.value }))

  const groups = computed(() => (snapshot.value ? contextGroups(snapshot.value, draft.value) : []))
  const omitted = computed(() => (snapshot.value ? omittedRows(snapshot.value, draft.value) : []))
  const changed = computed(() => !sameOverrides(draft.value, assistant.overrides.value))
  const rerunning = ref(false)

  return {
    open,
    snapshot,
    status,
    groups,
    omitted,
    changed,
    rerunning,
    show(id: string) {
      snapshotId.value = id
      draft.value = { pinned: [...assistant.overrides.value.pinned], removed: [...assistant.overrides.value.removed] }
      open.value = true
    },
    /** Pinning an item un-removes it (and vice versa). */
    togglePin(id: string) {
      draft.value = { pinned: toggleId(draft.value.pinned, id), removed: draft.value.removed.filter(entry => entry !== id) }
    },
    toggleRemove(id: string) {
      draft.value = { removed: toggleId(draft.value.removed, id), pinned: draft.value.pinned.filter(entry => entry !== id) }
    },
    async rerun() {
      rerunning.value = true
      open.value = false
      try {
        await assistant.rerun(draft.value)
      }
      finally {
        rerunning.value = false
      }
    },
  }
}
