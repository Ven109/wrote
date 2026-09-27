import { z } from 'zod'
import { CodexTypeIdSchema, RESERVED_CODEX_KEYS } from '#shared/schemas/codex'
import { EntryIdSchema } from '#shared/schemas/entry'
import { listCodexTypes } from '../codex/types'
import { listCodex } from '../services/codex'
import { pathForId } from '../services/entries'
import { defineWroteTool, ToolError } from './define'

const MAX_BODY = 8000

/** Frontmatter minus Wrote's own keys: the template/custom fields of an entry. */
function fieldsOf(frontmatter: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(frontmatter).filter(([key]) => !(RESERVED_CODEX_KEYS as readonly string[]).includes(key)))
}

export const getCodexTool = defineWroteTool({
  name: 'get_codex',
  title: 'Get codex entries',
  description: 'Lists the story bible (codex): characters, places, items, factions, lore, glossary and custom types. Filter by codexType, tag, or name (matches titles and aliases, e.g. a nickname). Returns id, title, codexType, aliases, tags, structured fields (role, appearance, relationships…) and a short excerpt. Use get_codex_entry or read_entry for the full description.',
  permission: 'read',
  input: z.object({
    codexType: CodexTypeIdSchema.optional().describe('e.g. character, place, item, faction, lore, glossary or a custom type'),
    tag: z.string().optional(),
    name: z.string().optional().describe('Title or alias (prefix match, case-insensitive)'),
  }),
  async handler(input, { book }) {
    const entries = await listCodex(book!, { type: input.codexType, tag: input.tag, q: input.name })
    return Promise.all(entries.map(async (entry) => {
      const stored = await book!.repository.read(entry.path)
      return { ...entry, type: 'codex' as const, fields: fieldsOf(stored.frontmatter as Record<string, unknown>) }
    }))
  },
})

export const getCodexEntryTool = defineWroteTool({
  name: 'get_codex_entry',
  title: 'Get a codex entry',
  description: 'Returns one codex entry by id or by name/alias: its type (with the field definitions of the type template), fields, aliases and description (Markdown, truncated).',
  permission: 'read',
  input: z.object({
    id: EntryIdSchema.optional(),
    name: z.string().optional().describe('Title or alias'),
  }).refine(input => input.id || input.name, 'Pass id or name'),
  async handler(input, { book }) {
    const path = input.id
      ? await pathForId(book!.db, input.id)
      : (await listCodex(book!, { q: input.name })).find(entry => [entry.title, ...entry.aliases].some(name => name.toLowerCase() === input.name!.toLowerCase()))?.path
    if (!path) throw new ToolError(`No codex entry named "${input.name}"`, 'not_found')
    const entry = await book!.repository.read(path)
    const frontmatter = entry.frontmatter as Record<string, unknown>
    const type = (await listCodexTypes(book!.root)).types.find(candidate => candidate.id === frontmatter.codexType)
    return {
      id: entry.frontmatter.id,
      path: entry.path,
      type: 'codex' as const,
      title: entry.frontmatter.title,
      codexType: frontmatter.codexType,
      template: type ? { label: type.label, fields: type.fields.map(field => ({ key: field.key, label: field.label, kind: field.kind })) } : null,
      aliases: frontmatter.aliases ?? [],
      fields: fieldsOf(frontmatter),
      body: entry.body.slice(0, MAX_BODY),
      truncated: entry.body.length > MAX_BODY,
    }
  },
})
