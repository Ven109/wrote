import type { InjectionKey } from 'vue'

/** Provided by the write page when ghost-text autocomplete may run. */
export interface AutocompleteContext {
  /** Switched on in the AI settings (off by default). */
  enabled: Ref<boolean>
  complete: (before: string, signal: AbortSignal) => Promise<string>
}

export const AUTOCOMPLETE_CONTEXT: InjectionKey<AutocompleteContext> = Symbol('autocomplete')
