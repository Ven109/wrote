import type { Editor } from '@tiptap/vue-3'
import type { InjectionKey } from 'vue'
import type { InlineAction } from '#shared/schemas/inline-ai'

/** What an inline action works on: the selection, or a whole block (drag handle, slash menu, mobile sheet). */
export type InlineAiTarget = { kind: 'selection' } | { kind: 'block', pos: number }

/** Provided by the write page: runs inline AI actions (streamed into suggestions). */
export interface InlineAiContext {
  run: (editor: Editor, action: InlineAction, target: InlineAiTarget, param?: string) => void
  /** Opens the "Ask AI" prompt for a target. */
  ask: (editor: Editor, target: InlineAiTarget) => void
}

export const INLINE_AI_CONTEXT: InjectionKey<InlineAiContext> = Symbol('inline-ai')
