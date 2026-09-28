import type { InjectionKey } from 'vue'
import type { FocusScope } from '#shared/schemas/writing-modes'

/** Provided by the write page: which writing modes the editor should apply (other editors get none). */
export interface WritingModesContext {
  focus: Readonly<Ref<boolean>>
  focusScope: Readonly<Ref<FocusScope>>
  typewriter: Readonly<Ref<boolean>>
  /** Hide the editor's own toolbars and handles. */
  distractionFree: Readonly<Ref<boolean>>
}

export const WRITING_MODES_CONTEXT: InjectionKey<WritingModesContext> = Symbol('writing-modes')
