import type { EditorSuggestionMenuItem } from '@nuxt/ui'
import type { EntryType } from '#shared/schemas/entry'
import type { LinkRef } from '#shared/schemas/links'

const GROUPS: { label: string, types: EntryType[], icon: string }[] = [
  { label: 'Manuscript', types: ['scene', 'chapter', 'part'], icon: 'i-lucide-feather' },
  { label: 'Codex', types: ['codex'], icon: 'i-lucide-book-user' },
  { label: 'Notes', types: ['note'], icon: 'i-lucide-sticky-note' },
  { label: 'Research', types: ['research'], icon: 'i-lucide-library' },
]

/** Groups linkable entries for the `[[` picker (fuzzy-filtered client-side by title). */
export function pickerGroups(targets: LinkRef[]): EditorSuggestionMenuItem[][] {
  return GROUPS.map(group => targets.filter(ref => group.types.includes(ref.type)))
    .map((refs, index) => refs.length
      ? [{ type: 'label' as const, label: GROUPS[index]!.label }, ...refs.map(ref => ({ kind: 'wikiLink', target: ref.title, label: ref.title, icon: GROUPS[index]!.icon }))]
      : [])
    .filter(group => group.length > 0)
}
