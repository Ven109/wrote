import { storeToRefs } from 'pinia'
import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import { booksQuery } from '~/queries/books'
import { bookKeys } from '~/queries/keys'
import { useCaptureStore } from '~/stores/capture'

/**
 * Quick capture into the inbox of the current book (or the first book outside a book).
 * Keyboard only: ⌘⇧N opens, Enter saves, Shift+Enter adds a line, Esc cancels.
 */
export function useQuickCapture() {
  const store = useCaptureStore()
  const { open, text } = storeToRefs(store)
  const queryCache = useQueryCache()
  const toast = useToast()
  const { bookId: routeBookId } = useAppNavigation()
  const { data: books } = useQuery(booksQuery)
  const targetBookId = computed(() => routeBookId.value ?? books.value?.[0]?.id ?? null)
  const targetTitle = computed(() => books.value?.find(book => book.id === targetBookId.value)?.title ?? null)

  const { mutateAsync, isLoading: saving } = useMutation({
    mutation: ({ bookId, body }: { bookId: string, body: string }) =>
      $fetch<{ id: string, path: string }>(`/api/books/${encodeURIComponent(bookId)}/notes`, { method: 'POST', body: { text: body } }),
    onSettled: (_data, _error, { bookId }) => queryCache.invalidateQueries({ key: bookKeys.notes(bookId) }),
  })

  function show() {
    open.value = true
  }

  async function submit() {
    const bookId = targetBookId.value
    if (!text.value.trim() || saving.value) return
    if (!bookId) {
      toast.add({ title: 'Create a book first', color: 'warning' })
      return
    }
    try {
      await mutateAsync({ bookId, body: text.value })
      text.value = ''
      open.value = false
      toast.add({ title: 'Captured to inbox', icon: 'i-lucide-inbox', color: 'success' })
    }
    catch (error) {
      toast.add({ title: 'Could not capture', description: apiErrorMessage(error), color: 'error' })
    }
  }

  /** Enter saves; Shift+Enter keeps the newline. */
  function onKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return
    event.preventDefault()
    void submit()
  }

  return { open, text, saving, targetTitle, show, submit, onKeydown }
}

/** Registers the global ⌘⇧N shortcut. Call once (in the capture modal). */
export function useQuickCaptureShortcut() {
  const { open } = storeToRefs(useCaptureStore())
  defineShortcuts({
    meta_shift_n: {
      usingInput: true,
      handler: () => {
        open.value = true
      },
    },
  })
}
