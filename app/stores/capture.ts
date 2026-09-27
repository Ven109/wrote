import { defineStore } from 'pinia'

/** Quick capture modal state (opened from anywhere via shortcut or command palette). */
export const useCaptureStore = defineStore('capture', () => {
  const open = ref(false)
  const text = ref('')
  return { open, text }
})
