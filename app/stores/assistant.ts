import { defineStore } from 'pinia'
import type { ContextOverrides } from '#shared/schemas/context'

const NO_OVERRIDES: ContextOverrides = { pinned: [], removed: [] }

/**
 * Assistant UI state shared across the app: the thread chosen per book (`null` = new chat, missing = latest)
 * and the author's context overrides per book (pinned / removed context items, sent with every message).
 */
export const useAssistantStore = defineStore('assistant', () => {
  const activeThreads = ref<Record<string, string | null>>({})
  const overrides = ref<Record<string, ContextOverrides>>({})

  function setActive(bookId: string, threadId: string | null) {
    activeThreads.value = { ...activeThreads.value, [bookId]: threadId }
  }

  function setOverrides(bookId: string, value: ContextOverrides) {
    overrides.value = { ...overrides.value, [bookId]: { pinned: [...new Set(value.pinned)], removed: [...new Set(value.removed)] } }
  }

  const overridesFor = (bookId: string) => overrides.value[bookId] ?? NO_OVERRIDES

  return { activeThreads, setActive, overrides, setOverrides, overridesFor }
})
