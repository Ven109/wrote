import { useEventListener } from '@vueuse/core'
import { useQuery, useQueryCache } from '@pinia/colada'
import type { Editor } from '@tiptap/vue-3'
import type { EntryDocument } from '#shared/schemas/document'
import { COMMENTS_CONTEXT, type CommentsContext } from '~/editor/comments-context'
import { bookKeys } from '~/queries/keys'
import { entryCommentsQuery } from '~/queries/comments'

/**
 * Comments on the open entry (from the author or agents such as a Claude Code critique): highlighted in the
 * editor, shown in the margin (a panel on smaller screens), answered and resolved here. Live via SSE.
 */
export function useComments(bookId: MaybeRefOrGetter<string>, document: Ref<EntryDocument | undefined>) {
  const queryCache = useQueryCache()
  const toast = useToast()
  const entryId = () => document.value?.id ?? ''
  const { data } = useQuery(() => entryCommentsQuery({ bookId: toValue(bookId), entryId: entryId() }))
  const comments = computed(() => data.value ?? [])
  const editor = shallowRef<Editor | null>(null)
  const active = ref<string | null>(null)
  const layoutVersion = ref(0)
  const panelOpen = ref(false)
  const busy = ref<string | null>(null)
  const bump = () => layoutVersion.value++
  const { isWide } = useBreakpoint()
  /** Whether the margin column is shown (wide screens with open comments). */
  const margin = computed(() => isWide.value && comments.value.length > 0)

  async function post(id: string, action: 'replies' | 'resolve' | 'dismiss' | 'fix', body: Record<string, unknown>, failure: string) {
    busy.value = id
    try {
      await $fetch(`/api/books/${encodeURIComponent(toValue(bookId))}/comments/${id}/${action}`, { method: 'POST', body })
      await queryCache.invalidateQueries({ key: bookKeys.entryComments(toValue(bookId), entryId()) })
      if (action === 'fix') await queryCache.invalidateQueries({ key: bookKeys.entrySuggestions(toValue(bookId), entryId()) })
    }
    catch (error) {
      toast.add({ title: failure, description: apiErrorMessage(error), color: 'error' })
    }
    finally {
      busy.value = null
    }
  }

  const context: CommentsContext = {
    comments,
    active,
    editor,
    layoutVersion,
    attach: (value) => {
      editor.value?.off('transaction', bump)
      editor.value = value
      value?.on('transaction', bump)
      bump()
    },
    focus: (id) => {
      active.value = id
      // Without a margin, clicking a highlighted passage opens the list.
      if (!isWide.value) panelOpen.value = true
    },
  }
  provide(COMMENTS_CONTEXT, context)
  watch(entryId, () => (active.value = null))
  if (import.meta.client) useEventListener(window, 'resize', bump)

  return {
    context,
    comments,
    active,
    panelOpen,
    margin,
    busy,
    focus: context.focus,
    reply: (id: string, body: string) => post(id, 'replies', { body }, 'Could not send the reply'),
    resolve: (id: string) => post(id, 'resolve', { resolved: true }, 'Could not resolve the comment'),
    /** Review findings: hide for good (not raised again), or turn the fix into a suggestion. */
    dismiss: (id: string) => post(id, 'dismiss', {}, 'Could not dismiss the finding'),
    fix: (id: string) => post(id, 'fix', {}, 'Could not suggest the fix'),
  }
}
