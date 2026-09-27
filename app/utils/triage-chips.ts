import type { TriageSuggestions } from '#shared/schemas/triage'
import { linkedTargets } from '#shared/utils/triage'

export interface TriageChip {
  key: string
  kind: 'tag' | 'link' | 'chapter'
  /** Tag, or the title to link to. */
  value: string
  label: string
  icon: string
}

/** Chips for the triage bar, without dismissed ones and what the note already has (tags, links in the draft). */
export function triageChips(suggestions: TriageSuggestions | undefined, note: { tags: string[], draft: string }, dismissed: Set<string>): TriageChip[] {
  if (!suggestions) return []
  const linked = linkedTargets(note.draft)
  const hasTag = (tag: string) => note.tags.some(existing => existing.toLowerCase() === tag.toLowerCase())
  const chips: TriageChip[] = [
    ...suggestions.tags.filter(tag => !hasTag(tag)).map(tag => ({ key: `tag:${tag}`, kind: 'tag' as const, value: tag, label: `#${tag}`, icon: 'i-lucide-hash' })),
    ...suggestions.links.filter(link => !linked.has(link.title.toLowerCase())).map(link => ({ key: `link:${link.id}`, kind: 'link' as const, value: link.title, label: link.title, icon: link.reason === 'mentioned' ? 'i-lucide-at-sign' : 'i-lucide-link' })),
    ...(suggestions.chapter && !linked.has(suggestions.chapter.title.toLowerCase())
      ? [{ key: `chapter:${suggestions.chapter.id}`, kind: 'chapter' as const, value: suggestions.chapter.title, label: suggestions.chapter.title, icon: 'i-lucide-book-open' }]
      : []),
  ]
  return chips.filter(chip => !dismissed.has(chip.key))
}

export const chipActionLabel = (chip: TriageChip) =>
  chip.kind === 'tag' ? `Add tag ${chip.value}` : chip.kind === 'link' ? `Link ${chip.value}` : `Link chapter ${chip.value} and file the note`
