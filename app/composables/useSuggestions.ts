import { useQuery, useQueryCache } from '@pinia/colada'
import type { Editor } from '@tiptap/vue-3'
import type { EntryDocument } from '#shared/schemas/document'
import type { ResolveSuggestionsInput, SuggestionView } from '#shared/schemas/suggestion'
import { suggestionRange, type SuggestionActionDetail } from '~/editor/extensions/ai-suggestions'
import { applySuggestion } from '~/editor/suggestion-apply'
import { SUGGESTIONS_CONTEXT, type SuggestionsContext } from '~/editor/suggestions-context'
import { bookKeys } from '~/queries/keys'
import { entrySuggestionsQuery } from '~/queries/suggestions'

/**
 * AI suggestions (tracked changes) of the open entry: shown inline by the editor and listed in a panel.
 * Accepting applies the proposal as a normal, undoable editor change (saved by autosave) and records the
 * decision; nothing changes the text without the author's accept.
 */
export function useSuggestions(bookId: MaybeRefOrGetter<string>, document: Ref<EntryDocument | undefined>) {
  const queryCache = useQueryCache()
  const toast = useToast()
  const entryId = () => document.value?.id ?? ''
  const { data } = useQuery(() => entrySuggestionsQuery({ bookId: toValue(bookId), entryId: entryId() }))
  const suggestions = computed(() => data.value ?? [])
  const editor = shallowRef<Editor | null>(null)
  const panelOpen = ref(false)
  const editingId = ref<string | null>(null)
  const draft = ref('')
  const busy = ref(false)
  const byId = (id: string) => suggestions.value.find(suggestion => suggestion.id === id)

  async function resolve(input: ResolveSuggestionsInput) {
    await $fetch(`/api/books/${encodeURIComponent(toValue(bookId))}/suggestions/resolve`, { method: 'POST', body: input })
    // Drop them locally right away; the SSE event refreshes other views.
    const resolved = new Set(input.ids)
    queryCache.setQueryData(bookKeys.entrySuggestions(toValue(bookId), entryId()), suggestions.value.filter(s => !resolved.has(s.id)))
  }

  async function run(task: () => Promise<void>, failure: string) {
    busy.value = true
    try {
      await task()
    }
    catch (error) {
      toast.add({ title: failure, description: apiErrorMessage(error), color: 'error' })
    }
    finally {
      busy.value = false
    }
  }

  /** Applies a suggestion in the editor, then records it. Stale ones cannot be accepted. */
  function accept(id: string, text?: string) {
    return run(async () => {
      const suggestion = byId(id)
      if (!suggestion || !editor.value) return
      if (!applySuggestion(editor.value, suggestion, text)) {
        toast.add({ title: 'This suggestion no longer fits the text', description: 'The passage it refers to has changed. Reject it or ask again.', color: 'warning' })
        return
      }
      await resolve({ ids: [id], status: 'accepted', ...(text !== undefined ? { text } : {}) })
      if (editingId.value === id) editingId.value = null
    }, 'Could not accept the suggestion')
  }

  const reject = (id: string) => run(() => resolve({ ids: [id], status: 'rejected' }), 'Could not reject the suggestion')

  /** Accepts every suggestion that still fits, from the end of the document backwards so ranges stay valid. */
  function acceptAll() {
    return run(async () => {
      if (!editor.value) return
      const view = editor.value
      const located = suggestions.value
        .map(suggestion => ({ suggestion, range: suggestionRange(view.state, suggestion.id) }))
        .filter((item): item is { suggestion: SuggestionView, range: { from: number, to: number } } => item.range !== null)
        .sort((a, b) => b.range.from - a.range.from)
      const applied = located.filter(({ suggestion }) => applySuggestion(view, suggestion)).map(({ suggestion }) => suggestion.id)
      if (applied.length) await resolve({ ids: applied, status: 'accepted' })
    }, 'Could not accept the suggestions')
  }

  const rejectAll = () => run(() => resolve({ ids: suggestions.value.map(s => s.id), status: 'rejected' }), 'Could not reject the suggestions')

  function edit(id: string) {
    draft.value = byId(id)?.replace ?? ''
    editingId.value = id
    panelOpen.value = true
  }

  function jumpTo(id: string) {
    const range = editor.value && suggestionRange(editor.value.state, id)
    if (!editor.value || !range) return
    editor.value.chain().focus().setTextSelection(range).scrollIntoView().run()
    panelOpen.value = false
  }

  const context: SuggestionsContext = {
    suggestions,
    attach: (value) => {
      editor.value = value
    },
    onAction: ({ id, action }: SuggestionActionDetail) => {
      if (action === 'accept') void accept(id)
      else if (action === 'reject') void reject(id)
      else edit(id)
    },
  }
  provide(SUGGESTIONS_CONTEXT, context)

  watch(entryId, () => {
    editingId.value = null
  })

  return { context, suggestions, panelOpen, editingId, draft, busy, accept, reject, acceptAll, rejectAll, edit, jumpTo, cancelEdit: () => (editingId.value = null) }
}
