import { z } from 'zod'
import type { CodexField, CodexTypeTemplate } from '#shared/schemas/codex'
import type { CodexProposal } from '#shared/schemas/codex-proposals'

/** What the model returns for a scanned text (structured output). */
export const ExtractionOutputSchema = z.object({
  entries: z.array(z.object({
    name: z.string().describe('The name as written in the text'),
    type: z.string().describe('One of the codex type ids listed in the instructions'),
    existingId: z.string().nullable().describe('Id of the existing codex entry this is about, or null for a new one'),
    aliases: z.array(z.string()).describe('Other names the text uses for it'),
    facts: z.array(z.object({ field: z.string(), value: z.string() })).describe('Template fields the text states (field key and value)'),
    description: z.string().describe('One or two sentences with only what the text says'),
    evidence: z.array(z.string()).describe('Up to three short quotes copied exactly from the text'),
  })),
})
export type ExtractionOutput = z.infer<typeof ExtractionOutputSchema>

export interface ExistingCodexEntry {
  id: string
  path: string
  title: string
  codexType: string
  aliases: string[]
  frontmatter: Record<string, unknown>
}

export type ProposalDraft = Pick<CodexProposal, 'action' | 'codexType' | 'title' | 'targetEntryId' | 'targetPath' | 'aliases' | 'fields' | 'description' | 'evidence'>
type FieldValue = string | string[]

const MAX_EVIDENCE = 3
const squash = (text: string) => text.toLowerCase().replace(/[*_`>#]/g, '').replace(/[“”„]/g, '"').replace(/[‘’]/g, '\'').replace(/\s+/g, ' ').trim()
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()
const unique = (values: string[]) => values.filter((value, index) => value && values.findIndex(other => same(other, value)) === index)

/** Quotes that really occur in the text (models invent quotes; unsupported proposals are dropped). */
export function verifiedEvidence(quotes: string[], text: string): string[] {
  const haystack = squash(text)
  return unique(quotes.map(quote => quote.trim().replace(/^["'“”]+|["'“”]+$/g, '')).filter(quote => quote.length >= 3 && haystack.includes(squash(quote)))).slice(0, MAX_EVIDENCE)
}

function lookup(existing: ExistingCodexEntry[]) {
  const byName = (name: string) => existing.find(entry => same(entry.title, name) || entry.aliases.some(alias => same(alias, name)))
  return {
    match: (id: string | null, names: string[]) => existing.find(entry => entry.id === id) ?? names.map(byName).find(Boolean),
    idOf: (name: string) => byName(name)?.id,
  }
}

function toValue(field: CodexField, raw: string, idOf: (name: string) => string | undefined): FieldValue | null {
  const value = raw.trim()
  if (!value) return null
  const items = () => unique(value.split(/[;,]/).map(item => item.trim()).filter(Boolean))
  switch (field.kind) {
    case 'list': return items()
    case 'entries': return unique(items().map(idOf).filter((id): id is string => Boolean(id)))
    case 'entry': return idOf(value) ?? null
    case 'select': return field.options?.find(option => same(option, value)) ?? null
    default: return value
  }
}

function fieldsFor(type: CodexTypeTemplate, facts: { field: string, value: string }[], idOf: (name: string) => string | undefined): Record<string, FieldValue> {
  const fields: Record<string, FieldValue> = {}
  for (const fact of facts) {
    const field = type.fields.find(candidate => same(candidate.key, fact.field) || same(candidate.label, fact.field))
    const value = field ? toValue(field, fact.value, idOf) : null
    if (field && value !== null && (!Array.isArray(value) || value.length)) fields[field.key] = value
  }
  return fields
}

/** Keeps only what an update adds: new values, and list items not yet on the entry. */
function newFacts(fields: Record<string, FieldValue>, current: Record<string, unknown>): Record<string, FieldValue> {
  const result: Record<string, FieldValue> = {}
  for (const [key, value] of Object.entries(fields)) {
    const was = current[key]
    if (Array.isArray(value)) {
      const known = Array.isArray(was) ? (was as string[]) : []
      const added = value.filter(item => !known.some(k => same(k, item)))
      if (added.length) result[key] = [...known, ...added]
    }
    else if (typeof was !== 'string' || !same(was, value)) result[key] = value
  }
  return result
}

/**
 * Turns raw model output into reviewable proposals: drops entries without verifiable evidence, matches names
 * to existing entries (→ updates with only new facts), maps facts onto the type's template fields and merges
 * duplicates. Pure – the model call and storage happen in the service.
 */
export function normalizeExtraction(output: ExtractionOutput, text: string, existing: ExistingCodexEntry[], types: CodexTypeTemplate[]): ProposalDraft[] {
  const { match, idOf } = lookup(existing)
  const drafts = new Map<string, ProposalDraft>()
  for (const found of output.entries) {
    const name = found.name.trim()
    const evidence = verifiedEvidence(found.evidence, text)
    if (!name || !evidence.length) continue
    const target = match(found.existingId, [name, ...found.aliases])
    const type = types.find(t => t.id === (target?.codexType ?? found.type)) ?? types.find(t => t.id === 'lore') ?? types[0]!
    const fields = fieldsFor(type, found.facts, idOf)
    const key = target?.id ?? name.toLowerCase()
    const previous = drafts.get(key)
    const draft: ProposalDraft = {
      action: target ? 'update' : 'create',
      codexType: type.id,
      title: target?.title ?? name,
      targetEntryId: target?.id ?? null,
      targetPath: target?.path ?? null,
      aliases: unique([...(previous?.aliases ?? []), ...found.aliases, ...(target && !same(name, target.title) ? [name] : [])])
        .filter(alias => !same(alias, target?.title ?? name) && !(target?.aliases ?? []).some(known => same(known, alias))),
      fields: { ...(previous?.fields ?? {}), ...(target ? newFacts(fields, target.frontmatter) : fields) },
      description: previous?.description || (target ? '' : found.description.trim()),
      evidence: unique([...(previous?.evidence ?? []), ...evidence]).slice(0, MAX_EVIDENCE),
    }
    drafts.set(key, draft)
  }
  return [...drafts.values()].filter(draft => draft.action === 'create' || draft.aliases.length || Object.keys(draft.fields).length)
}
