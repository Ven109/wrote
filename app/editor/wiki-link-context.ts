import type { EditorCustomHandlers, EditorSuggestionMenuItem } from '@nuxt/ui'
import type { InjectionKey } from 'vue'

export interface WikiLinkState {
  title: string | null
  href: string | null
  broken: boolean
}

/** Provided by pages that edit an entry; consumed by the wiki-link chip node view and the `[[` picker. */
export interface WikiLinkContext {
  resolve: (target: string) => WikiLinkState
  /** Follows a link (opens it, or creates a note for a broken one). */
  open: (target: string, options?: { newTab?: boolean }) => void
  pickerItems: Ref<EditorSuggestionMenuItem[][]>
}

export const WIKI_LINK_CONTEXT: InjectionKey<WikiLinkContext> = Symbol('wiki-link-context')

/** Editor handler that inserts a wiki-link node for a picker item (`kind: 'wikiLink'`, `target`). */
export const wikiLinkHandlers: EditorCustomHandlers = {
  wikiLink: {
    canExecute: () => true,
    execute: (editor, item: { target?: string }) => editor.chain().focus().insertContent([
      { type: 'wikiLink', attrs: { target: item?.target ?? '', label: null } },
      { type: 'text', text: ' ' },
    ]),
    isActive: () => false,
  },
}
