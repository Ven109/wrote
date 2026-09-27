import { useQuery } from '@pinia/colada'
import { entryLinksQuery } from '~/queries/links'
import { entryHref } from '~/utils/entry-href'

/** Entries linking to the given entry, with context snippets and routes. Refreshes on book changes. */
export function useBacklinks(bookId: MaybeRefOrGetter<string>, entryId: MaybeRefOrGetter<string | undefined>) {
  const { data, status } = useQuery(() => entryLinksQuery({ bookId: toValue(bookId), entryId: toValue(entryId) ?? '' }))
  const backlinks = computed(() => (data.value?.backlinks ?? []).map(link => ({ ...link, href: entryHref(toValue(bookId), link) })))
  return { backlinks, status }
}
