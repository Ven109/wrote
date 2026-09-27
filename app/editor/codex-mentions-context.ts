import type { EditorSuggestionMenuItem } from '@nuxt/ui'
import type { InjectionKey } from 'vue'
import type { CodexMentionTarget } from '#shared/schemas/codex'
import type { NameMatcher } from '#shared/utils/name-matcher'

/** Provided by pages that edit entries: codex names to detect, the @ menu and hover-card data. */
export interface CodexMentionsContext {
  matcher: Ref<NameMatcher | null>
  menuItems: Ref<EditorSuggestionMenuItem[][]>
  target: (entryId: string) => CodexMentionTarget | undefined
  href: (target: CodexMentionTarget) => string
  icon: (codexType: string) => string
  typeLabel: (codexType: string) => string
}

export const CODEX_MENTIONS_CONTEXT: InjectionKey<CodexMentionsContext> = Symbol('codex-mentions')
