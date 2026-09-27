import { Chat } from '@ai-sdk/vue'
import { useQuery, useQueryCache } from '@pinia/colada'
import { DefaultChatTransport, type UIMessage } from 'ai'
import type { ChatThread } from '#shared/schemas/chat'
import { chatThreadsQuery } from '~/queries/chat'
import { documentQuery } from '~/queries/documents'
import { bookKeys } from '~/queries/keys'
import { useAssistantStore } from '~/stores/assistant'

/**
 * The assistant chat of a book: threads (persisted server-side), the active conversation as an
 * AI SDK `Chat` (streaming, stop, regenerate) and the context sent with every message (open entry).
 */
export function useAssistant(bookId: MaybeRefOrGetter<string>) {
  const store = useAssistantStore()
  const queryCache = useQueryCache()
  const { activeEntryPath } = useAppNavigation()
  const id = () => toValue(bookId)
  const base = () => `/api/books/${encodeURIComponent(id())}/chat`
  const { data: threadsData } = useQuery(() => chatThreadsQuery(id()))
  const threads = computed(() => threadsData.value ?? [])
  // Until the user picks a thread (or "New chat") this session, continue the most recent one.
  const threadId = computed(() => {
    const chosen = store.activeThreads[id()]
    return chosen === undefined ? threads.value[0]?.id ?? null : chosen
  })
  const chat = shallowRef<Chat<UIMessage> | null>(null)
  const input = ref('')
  const refreshThreads = () => queryCache.invalidateQueries({ key: bookKeys.chatThreads(id()) })
  const { book } = useBook(id)
  const { data: openEntry } = useQuery(() => documentQuery({ bookId: id(), path: activeEntryPath.value ?? '' }))
  /** What the assistant knows about without being told (shown above the prompt). */
  const contextChips = computed(() => [
    ...(book.value ? [{ icon: 'i-lucide-book', label: book.value.title }] : []),
    ...(activeEntryPath.value && openEntry.value ? [{ icon: 'i-lucide-file-text', label: openEntry.value.title }] : []),
  ])

  function createChat(thread: string, messages: UIMessage[]) {
    return new Chat<UIMessage>({
      id: thread,
      messages,
      transport: new DefaultChatTransport({
        api: base(),
        prepareSendMessagesRequest: ({ messages: all }) => ({
          body: { threadId: thread, messages: all, context: { entryPath: activeEntryPath.value ?? undefined } },
        }),
      }),
      onFinish: () => void refreshThreads(),
    })
  }

  /** Loads a thread's conversation (or clears it). Does not record a choice. */
  async function load(thread: string | null) {
    if (!thread) {
      chat.value = null
      return
    }
    if (chat.value?.id === thread) return
    const messages = await $fetch<UIMessage[]>(`${base()}/threads/${thread}/messages`).catch(() => [])
    if (threadId.value === thread) chat.value = createChat(thread, messages)
  }

  /** The user picks a thread (`null` = new chat); remembered for this session. */
  async function open(thread: string | null) {
    store.setActive(id(), thread)
    await load(thread)
  }

  if (import.meta.client) watch(threadId, thread => void load(thread), { immediate: true })

  async function send() {
    const text = input.value.trim()
    if (!text) return
    input.value = ''
    if (!chat.value) {
      const thread = await $fetch<ChatThread>(`${base()}/threads`, { method: 'POST' })
      chat.value = createChat(thread.id, [])
      store.setActive(id(), thread.id)
      void refreshThreads()
    }
    await chat.value.sendMessage({ text })
  }

  async function remove(thread: string) {
    await $fetch(`${base()}/threads/${thread}`, { method: 'DELETE' }).catch(() => null)
    if (threadId.value === thread) await open(null)
    await refreshThreads()
  }

  const errorCode = computed(() => {
    const message = chat.value?.error?.message ?? ''
    return message.includes('ai_not_configured') || message.includes('No AI model') ? 'ai_not_configured' : chat.value?.error ? 'error' : null
  })

  return {
    contextChips,
    threads,
    threadId,
    input,
    messages: computed(() => chat.value?.messages ?? []),
    status: computed(() => chat.value?.status ?? 'ready'),
    error: computed(() => chat.value?.error ?? null),
    errorCode,
    send,
    stop: () => chat.value?.stop(),
    regenerate: () => chat.value?.regenerate(),
    open,
    newThread: () => open(null),
    remove,
  }
}
