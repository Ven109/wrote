import { useQuery } from '@pinia/colada'
import type { EntryDocument } from '#shared/schemas/document'
import { AUTOCOMPLETE_CONTEXT, type AutocompleteContext } from '~/editor/autocomplete-context'
import { aiSettingsQuery } from '~/queries/settings'

/** Ghost-text autocomplete for the write page: on only when enabled in the AI settings. */
export function useAutocomplete(bookId: MaybeRefOrGetter<string>, document: Ref<EntryDocument | undefined>) {
  const { data: settings } = useQuery(aiSettingsQuery)
  const context: AutocompleteContext = {
    enabled: computed(() => Boolean(settings.value?.autocomplete && document.value)),
    async complete(before, signal) {
      const path = document.value?.path
      if (!path) return ''
      const result = await $fetch<{ text: string }>(`/api/books/${encodeURIComponent(toValue(bookId))}/ai/complete`, { method: 'POST', body: { entryPath: path, before }, signal })
      return result.text
    },
  }
  provide(AUTOCOMPLETE_CONTEXT, context)
  return context
}
