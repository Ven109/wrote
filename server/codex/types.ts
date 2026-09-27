import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parse, stringify } from 'yaml'
import { BUILT_IN_CODEX_TYPES, CodexTypeTemplateSchema, type CodexField, type CodexTypeTemplate } from '#shared/schemas/codex'
import { writeFileAtomic } from '../storage/fs'

export const CUSTOM_TYPES_DIR = 'codex/_types'

export interface CodexTypesResult {
  types: CodexTypeTemplate[]
  /** Custom type files that could not be loaded (shown to the author, never fatal). */
  errors: { file: string, message: string }[]
}

/** Built-in types plus custom types from `codex/_types/<id>.yaml` (the file name is the type id). */
export async function listCodexTypes(root: string): Promise<CodexTypesResult> {
  const dir = join(root, CUSTOM_TYPES_DIR)
  const files = (await readdir(dir).catch(() => [] as string[])).filter(file => /\.ya?ml$/.test(file)).sort()
  const custom: CodexTypeTemplate[] = []
  const errors: CodexTypesResult['errors'] = []
  const builtInIds = new Set(BUILT_IN_CODEX_TYPES.map(type => type.id))
  for (const file of files) {
    const id = file.replace(/\.ya?ml$/, '')
    try {
      const raw = parse(await readFile(join(dir, file), 'utf8')) as Record<string, unknown> | null
      const template = CodexTypeTemplateSchema.parse({ folder: id, plural: raw?.label, ...raw, id, builtIn: false })
      if (builtInIds.has(id)) throw new Error('Conflicts with a built-in type')
      custom.push(template)
    }
    catch (error) {
      errors.push({ file: `${CUSTOM_TYPES_DIR}/${file}`, message: error instanceof Error ? error.message : String(error) })
    }
  }
  return { types: [...BUILT_IN_CODEX_TYPES, ...custom], errors }
}

/** Writes a custom type template as YAML (readable and editable outside Wrote). */
export async function saveCustomType(root: string, template: CodexTypeTemplate): Promise<void> {
  const { id, builtIn: _builtIn, ...rest } = CodexTypeTemplateSchema.parse({ ...template, builtIn: false })
  await writeFileAtomic(join(root, CUSTOM_TYPES_DIR, `${id}.yaml`), stringify(rest))
}

export type FieldValue = string | string[] | null

function checkValue(field: CodexField, value: FieldValue): string | null {
  if (value === null) return field.required ? `${field.label} is required` : null
  const wantsList = field.kind === 'list' || field.kind === 'entries'
  if (wantsList !== Array.isArray(value)) return `${field.label} must be ${wantsList ? 'a list' : 'text'}`
  if (field.kind === 'select' && field.options && !field.options.includes(value as string)) return `${field.label} must be one of ${field.options.join(', ')}`
  return null
}

/** Validates a field patch against a type template; keys outside the template are rejected. */
export function validateFields(template: CodexTypeTemplate, fields: Record<string, FieldValue>): string[] {
  const byKey = new Map(template.fields.map(field => [field.key, field]))
  return Object.entries(fields).flatMap(([key, value]) => {
    const field = byKey.get(key)
    if (!field) return [`${key} is not a field of ${template.label}`]
    const problem = checkValue(field, value)
    return problem ? [problem] : []
  })
}
