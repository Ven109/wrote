import type { ProposalDraft } from './extraction'

/** Expected entries of a fixture text, per codex type. */
export type ExpectedEntries = Record<string, string[]>

export interface ExtractionScore {
  /** Found / expected over all types (0…1). */
  recall: number
  byType: Record<string, { found: string[], missed: string[], recall: number }>
  /** Proposed entries not in the expected list (not necessarily wrong: the list only has the main ones). */
  extra: string[]
}

const key = (name: string) => name.toLowerCase().replace(/^the\s+/, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

/** Whether a proposal names an expected entry (title or alias; "The X" = "X"; "Aldo" matches "Brother Aldo"). */
function names(draft: ProposalDraft, expected: string): boolean {
  const target = key(expected)
  return [draft.title, ...draft.aliases].map(key).some(name => name === target || (name.length >= 4 && (target.endsWith(` ${name}`) || name.endsWith(` ${target}`))))
}

/** Scores extraction output against the expected main entries of a text: recall per type and overall. */
export function scoreExtraction(expected: ExpectedEntries, drafts: ProposalDraft[]): ExtractionScore {
  const byType: ExtractionScore['byType'] = {}
  let found = 0
  let total = 0
  for (const [type, entries] of Object.entries(expected)) {
    const hits = entries.filter(entry => drafts.some(draft => names(draft, entry)))
    byType[type] = { found: hits, missed: entries.filter(entry => !hits.includes(entry)), recall: entries.length ? hits.length / entries.length : 1 }
    found += hits.length
    total += entries.length
  }
  const all = Object.values(expected).flat()
  return { recall: total ? found / total : 1, byType, extra: drafts.filter(draft => !all.some(entry => names(draft, entry))).map(draft => draft.title) }
}
