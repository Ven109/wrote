import type { CodexProposal } from '#shared/schemas/codex-proposals'
import type { StructureNode } from '#shared/schemas/manuscript'

export interface ProposalDraft {
  title: string
  aliases: string[]
  description: string
  fields: Record<string, string | string[]>
}

export const draftFrom = (proposal: CodexProposal): ProposalDraft =>
  ({ title: proposal.title, aliases: [...proposal.aliases], description: proposal.description, fields: structuredClone(proposal.fields) })

/** The accept edits for a draft: only what the author changed. */
export function editsFrom(proposal: CodexProposal, draft: ProposalDraft) {
  const changed = <T>(a: T, b: T) => JSON.stringify(a) !== JSON.stringify(b)
  return {
    ...(draft.title.trim() !== proposal.title ? { title: draft.title.trim() } : {}),
    ...(changed(draft.aliases, proposal.aliases) ? { aliases: draft.aliases } : {}),
    ...(draft.description !== proposal.description ? { description: draft.description } : {}),
    ...(changed(draft.fields, proposal.fields) ? { fields: draft.fields } : {}),
  }
}

/** Chapters (and scenes of chapterless parts) to scan, labelled with their part. */
export function scanTargets(parts: StructureNode[]): { label: string, value: string }[] {
  return parts.flatMap(part => part.children.map(child => ({ label: `${part.title} › ${child.title}`, value: child.id })))
}

/** A field value for display: entry ids become titles. */
export function displayValue(value: string | string[], titleOf: (id: string) => string | undefined): string {
  const one = (item: string) => titleOf(item) ?? item
  return Array.isArray(value) ? value.map(one).join(', ') : one(value)
}
