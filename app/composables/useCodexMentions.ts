import { useQuery } from '@pinia/colada'
import type { CodexMentionTarget } from '#shared/schemas/codex'
import { createNameMatcher } from '#shared/utils/name-matcher'
import { CODEX_MENTIONS_CONTEXT, type CodexMentionsContext } from '~/editor/codex-mentions-context'
import { codexMentionsQuery } from '~/queries/codex'
import { entryHref } from '~/utils/entry-href'

/** Builds the `@` menu: codex entries with their aliases (matched by the menu's fuzzy filter). */
export function mentionMenuItems(targets: CodexMentionTarget[], icon: (type: string) => string) {
  if (!targets.length) return []
  return [[
    { type: 'label' as const, label: 'Codex' },
    ...targets.map(target => ({ kind: 'wikiLink', target: target.title, label: target.title, description: target.names.slice(1).join(' · ') || undefined, icon: icon(target.codexType) })),
  ]]
}

/**
 * Codex awareness for the editor: detection of names/aliases (decorations), `@` mentions that insert
 * `[[links]]`, and hover-card data. Provided to the editor components of the current page.
 */
export function useCodexMentions(bookId: MaybeRefOrGetter<string>) {
  const { data } = useQuery(() => codexMentionsQuery(toValue(bookId)))
  const { typeOf } = useCodexTypes(bookId)
  const targets = computed(() => data.value ?? [])
  const byId = computed(() => new Map(targets.value.map(target => [target.id, target])))
  const matcher = computed(() => (targets.value.length
    ? createNameMatcher(targets.value.flatMap(target => target.names.map(name => ({ name, entryId: target.id }))))
    : null))
  const icon = (codexType: string) => typeOf(codexType)?.icon ?? 'i-lucide-book-open'

  const context: CodexMentionsContext = {
    matcher,
    menuItems: computed(() => mentionMenuItems(targets.value, icon)),
    target: id => byId.value.get(id),
    href: target => entryHref(toValue(bookId), { type: 'codex', path: target.path }),
    icon,
    typeLabel: codexType => typeOf(codexType)?.label ?? codexType,
  }
  provide(CODEX_MENTIONS_CONTEXT, context)
  return context
}
