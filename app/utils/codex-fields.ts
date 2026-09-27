import type { CodexField, CodexTypeTemplate } from '#shared/schemas/codex'

export type FieldFormValue = string | string[]

export interface FieldForm {
  fields: Record<string, FieldFormValue>
  aliases: string[]
}

const isList = (field: CodexField) => field.kind === 'list' || field.kind === 'entries'

function toFormValue(field: CodexField, value: unknown): FieldFormValue {
  if (isList(field)) return Array.isArray(value) ? value.map(String) : value ? [String(value)] : []
  if (Array.isArray(value)) return value.join(', ')
  return value === undefined || value === null ? '' : String(value)
}

/** Form state for a template from frontmatter (missing fields become empty). */
export function fieldFormFrom(template: CodexTypeTemplate, frontmatter: Record<string, unknown>): FieldForm {
  return {
    fields: Object.fromEntries(template.fields.map(field => [field.key, toFormValue(field, frontmatter[field.key])])),
    aliases: Array.isArray(frontmatter.aliases) ? frontmatter.aliases.map(String) : [],
  }
}

const same = (a: FieldFormValue | undefined, b: FieldFormValue | undefined) => JSON.stringify(a ?? '') === JSON.stringify(b ?? '')

/** The changed keys as an API patch (empty values clear the field), or `null` when nothing changed. */
export function fieldPatch(template: CodexTypeTemplate, before: FieldForm, after: FieldForm): { fields: Record<string, string | string[] | null>, aliases?: string[] } | null {
  const fields: Record<string, string | string[] | null> = {}
  for (const field of template.fields) {
    const value = after.fields[field.key]
    if (same(before.fields[field.key], value)) continue
    const empty = value === undefined || (Array.isArray(value) ? value.length === 0 : value.trim() === '')
    fields[field.key] = empty ? null : Array.isArray(value) ? value : value.trim()
  }
  const aliasesChanged = !same(before.aliases, after.aliases)
  if (!Object.keys(fields).length && !aliasesChanged) return null
  return { fields, ...(aliasesChanged ? { aliases: after.aliases } : {}) }
}

/** Plain deep copy of a form (works on reactive proxies, unlike `structuredClone`). */
export function cloneForm(form: FieldForm): FieldForm {
  return {
    fields: Object.fromEntries(Object.entries(form.fields).map(([key, value]) => [key, Array.isArray(value) ? [...value] : value])),
    aliases: [...form.aliases],
  }
}
