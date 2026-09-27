import type { Editor } from '@tiptap/vue-3'
import type { InjectionKey } from 'vue'
import type { SuggestionView } from '#shared/schemas/suggestion'
import type { SuggestionActionDetail } from './extensions/ai-suggestions'

/** Provided by the write page: the open entry's pending suggestions and how to act on them. */
export interface SuggestionsContext {
  suggestions: Ref<SuggestionView[]>
  /** The editor registers itself so accepted suggestions can be applied to it. */
  attach: (editor: Editor | null) => void
  onAction: (detail: SuggestionActionDetail) => void
}

export const SUGGESTIONS_CONTEXT: InjectionKey<SuggestionsContext> = Symbol('suggestions')
