import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import { refDebounced } from '@vueuse/core'
import { bookKeys } from '~/queries/keys'
import { codexAppearancesQuery, codexListQuery, codexTypesQuery } from '~/queries/codex'
import { entryHref } from '~/utils/entry-href'

export type CodexView = 'list' | 'grid'

/** Codex types of a book (built-in + custom). */
export function useCodexTypes(bookId: MaybeRefOrGetter<string>) {
  const { data } = useQuery(() => codexTypesQuery(toValue(bookId)))
  const types = computed(() => data.value?.types ?? [])
  const typeErrors = computed(() => data.value?.errors ?? [])
  const typeOf = (id: string | undefined) => types.value.find(type => type.id === id)
  return { types, typeErrors, typeOf }
}

/** Codex browser: type/tag/search filters (combinable), list or grid view, and "New entry" per type. */
export function useCodex(bookId: MaybeRefOrGetter<string>) {
  const queryCache = useQueryCache()
  const toast = useToast()
  const type = ref<string | null>(null)
  const tag = ref<string | null>(null)
  const search = ref('')
  const q = refDebounced(search, 200)
  const view = useCookie<CodexView>('wrote-codex-view', { default: () => 'list' })
  const query = computed(() => ({ type: type.value ?? undefined, tag: tag.value ?? undefined, q: q.value.trim() || undefined }))
  const { data, status } = useQuery(() => codexListQuery({ bookId: toValue(bookId), query: query.value }))
  const entries = computed(() => data.value ?? [])
  const { types, typeErrors, typeOf } = useCodexTypes(bookId)
  const tags = computed(() => [...new Set(entries.value.flatMap(entry => entry.tags))].sort())

  const { mutateAsync } = useMutation({
    mutation: (input: { type: string, title: string }) =>
      $fetch<{ id: string, path: string }>(`/api/books/${encodeURIComponent(toValue(bookId))}/codex`, { method: 'POST', body: input }),
    onError: error => toast.add({ title: 'Could not create the entry', description: apiErrorMessage(error), color: 'error' }),
    onSettled: () => queryCache.invalidateQueries({ key: bookKeys.codex(toValue(bookId)) }),
  })

  /** Creates an entry and opens it. */
  async function createEntry(typeId: string, title: string) {
    const created = await mutateAsync({ type: typeId, title }).catch(() => null)
    if (created) await navigateTo(`/books/${toValue(bookId)}/codex/${created.path}`)
  }

  /** "New <type>" dialog state. */
  const creatingType = ref<string | null>(null)
  const creating = computed({
    get: () => creatingType.value !== null,
    set: (open) => {
      if (!open) creatingType.value = null
    },
  })
  async function submitNew(title: string) {
    const typeId = creatingType.value
    creatingType.value = null
    if (typeId) await createEntry(typeId, title)
  }
  const newItems = computed(() => types.value.map(t => ({ label: t.label, icon: t.icon, onSelect: () => (creatingType.value = t.id) })))

  return { type, tag, search, view, entries, status, types, typeErrors, typeOf, tags, createEntry, creatingType, creating, submitNew, newItems }
}

/** Codex entries as picker options (`entry` / `entries` fields store entry ids). */
export function useCodexEntryOptions(bookId: MaybeRefOrGetter<string>, exclude?: MaybeRefOrGetter<string | undefined>) {
  const { data } = useQuery(() => codexListQuery({ bookId: toValue(bookId), query: {} }))
  const options = computed(() => (data.value ?? [])
    .filter(entry => entry.id !== toValue(exclude))
    .map(entry => ({ label: entry.title, value: entry.id })))
  return { options }
}

/** Scenes that mention a codex entry, with counts and links. */
export function useCodexAppearances(bookId: MaybeRefOrGetter<string>, entryId: MaybeRefOrGetter<string | undefined>) {
  const { data, status } = useQuery(() => codexAppearancesQuery({ bookId: toValue(bookId), entryId: toValue(entryId) ?? '' }))
  const appearances = computed(() => (data.value ?? []).map(scene => ({ ...scene, href: entryHref(toValue(bookId), { type: 'scene', path: scene.path }) })))
  return { appearances, status }
}
