import { z } from 'zod'

/** How much of the text focus mode keeps bright: the paragraph or just the sentence at the caret. */
export const FocusScopeSchema = z.enum(['paragraph', 'sentence'])
export type FocusScope = z.infer<typeof FocusScopeSchema>

/**
 * Remembered writing-mode preferences (client-side). Every field falls back to its default, so a stale or
 * tampered value never breaks the editor. Distraction-free mode is not remembered: full screen needs a gesture.
 */
export const WritingModePrefsSchema = z.object({
  focus: z.boolean().catch(false),
  focusScope: FocusScopeSchema.catch('paragraph'),
  typewriter: z.boolean().catch(false),
  /** Whether the ambient session timer is shown. */
  timer: z.boolean().catch(false),
})
export type WritingModePrefs = z.infer<typeof WritingModePrefsSchema>

export const DEFAULT_WRITING_MODE_PREFS: WritingModePrefs = { focus: false, focusScope: 'paragraph', typewriter: false, timer: false }

/** Parses stored preferences, keeping valid fields and defaulting the rest. */
export function parseWritingModePrefs(value: unknown): WritingModePrefs {
  const input = value && typeof value === 'object' ? value : {}
  return WritingModePrefsSchema.parse({ ...DEFAULT_WRITING_MODE_PREFS, ...input })
}
