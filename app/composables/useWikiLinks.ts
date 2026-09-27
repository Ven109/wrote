import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import { refDebounced } from '@vueuse/core'
import { extractWikiLinks } from '#shared/utils/links'
import { WIKI_LINK_CONTEXT, type WikiLinkContext, type WikiLinkState } from '~/editor/wiki-link-context'
import { bookKeys } from '~/queries/keys'
import { linkTargetsQuery, resolvedLinksQuery } from '~/queries/links'
import { entryHref } from '~/utils/entry-href'
import { pickerGroups } from '~/utils/link-picker'

/**
 * Wiki links for the entry being edited: resolves the links in the draft (broken vs. linked),
 * feeds the `[[` picker and navigates on click. Provides the context to the editor node views.
 */
export function useWikiLinks(bookId: MaybeRefOrGetter<string>, draft: Ref<string>) {
  const queryCache = useQueryCache()
  const id = () => toValue(bookId)
  const debounced = refDebounced(draft, 400)
  const targets = computed(() => [...new Set(extractWikiLinks(debounced.value).map(link => link.target))].sort())

  const { data: resolved } = useQuery(() => resolvedLinksQuery({ bookId: id(), targets: targets.value }))
  const { data: linkables } = useQuery(() => linkTargetsQuery(id()))
  const pickerItems = computed(() => pickerGroups(linkables.value ?? []))

  const { mutateAsync: createNote } = useMutation({
    mutation: (title: string) => $fetch<{ path: string }>(`/api/books/${encodeURIComponent(id())}/notes`, { method: 'POST', body: { text: title } }),
    onSettled: () => queryCache.invalidateQueries({ key: bookKeys.links(id()) }),
  })

  function resolve(target: string): WikiLinkState {
    const ref = resolved.value?.[target]
    if (ref === undefined) return { title: null, href: null, broken: false }
    return ref ? { title: ref.title, href: entryHref(id(), ref), broken: false } : { title: null, href: null, broken: true }
  }

  async function open(target: string, options: { newTab?: boolean } = {}) {
    let href = resolve(target).href
    if (!href) {
      const { path } = await createNote(target)
      href = entryHref(id(), { type: 'note', path })
    }
    await navigateTo(href, options.newTab ? { open: { target: '_blank' } } : undefined)
  }

  const context: WikiLinkContext = { resolve, open, pickerItems }
  provide(WIKI_LINK_CONTEXT, context)
  return context
}
