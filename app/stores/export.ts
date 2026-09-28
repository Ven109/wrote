import { defineStore } from 'pinia'

/** Export dialog state (opened from the top bar or the command palette). */
export const useExportStore = defineStore('export', () => {
  const open = ref(false)
  return { open }
})
