import { defineStore } from 'pinia'
import { DEFAULT_WRITING_MODE_PREFS, parseWritingModePrefs, type WritingModePrefs } from '#shared/schemas/writing-modes'

/**
 * Writing modes shared by the layout, the write page and the editor: remembered preferences (focus, typewriter,
 * timer – a cookie, so SSR renders the right chrome) and the transient distraction-free flag.
 */
export const useWritingModesStore = defineStore('writing-modes', () => {
  const cookie = useCookie<Partial<WritingModePrefs>>('wrote-writing-modes', { default: () => ({ ...DEFAULT_WRITING_MODE_PREFS }) })
  const prefs = computed<WritingModePrefs>(() => parseWritingModePrefs(cookie.value))
  const distractionFree = ref(false)

  function setPref<K extends keyof WritingModePrefs>(key: K, value: WritingModePrefs[K]) {
    cookie.value = { ...prefs.value, [key]: value }
  }

  return { prefs, distractionFree, setPref }
})
