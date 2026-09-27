export type EditorMode = 'block' | 'document'
export type EditorModePreference = 'auto' | EditorMode

/** Resolves the automatic mode: blocks need a large screen and a fine pointer (drag handles). */
export function resolveEditorMode(preference: EditorModePreference, isDesktop: boolean, isCoarsePointer: boolean): EditorMode {
  if (preference !== 'auto') return preference
  return isDesktop && !isCoarsePointer ? 'block' : 'document'
}

/**
 * Editor chrome mode: `block` (drag handle, block menu, bubble toolbar) or
 * `document` (bottom toolbar + action sheet). The preference is persisted; mode never changes the document.
 */
export function useEditorMode() {
  const preference = useCookie<EditorModePreference>('wrote-editor-mode', { default: () => 'auto' })
  const { isDesktop, isCoarsePointer } = useBreakpoint()
  const mode = computed(() => resolveEditorMode(preference.value, isDesktop.value, isCoarsePointer.value))

  function setPreference(value: EditorModePreference) {
    preference.value = value
  }

  return { mode, preference, setPreference }
}
