import { defineStore } from 'pinia'

/** Assistant UI state shared across the app: the thread chosen per book (`null` = new chat, missing = latest). */
export const useAssistantStore = defineStore('assistant', () => {
  const activeThreads = ref<Record<string, string | null>>({})

  function setActive(bookId: string, threadId: string | null) {
    activeThreads.value = { ...activeThreads.value, [bookId]: threadId }
  }

  return { activeThreads, setActive }
})
