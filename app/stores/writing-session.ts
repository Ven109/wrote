import { defineStore } from 'pinia'

/** Per-book word count at the start of this writing session (since the app was opened). */
export const useWritingSessionStore = defineStore('writing-session', () => {
  const baselines = ref<Record<string, number>>({})

  /** Records `total` as the session start for `bookId` unless one is already set; returns the baseline. */
  function baseline(bookId: string, total: number): number {
    if (baselines.value[bookId] === undefined) baselines.value = { ...baselines.value, [bookId]: total }
    return baselines.value[bookId]!
  }

  return { baselines, baseline }
})
