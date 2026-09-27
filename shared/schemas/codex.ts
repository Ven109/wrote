import { z } from 'zod'

/** A codex type id: built-in (`character`, …) or custom (`creature`, `spell`, …). */
export const CodexTypeIdSchema = z.string().regex(/^[a-z][a-z0-9-]{0,39}$/, 'Use lowercase letters, digits and dashes')

export const CODEX_FIELD_KINDS = ['text', 'longtext', 'list', 'select', 'entry', 'entries'] as const
export const CodexFieldKindSchema = z.enum(CODEX_FIELD_KINDS)
export type CodexFieldKind = z.infer<typeof CodexFieldKindSchema>

/** Frontmatter keys owned by Wrote; templates cannot redefine them. */
export const RESERVED_CODEX_KEYS = ['id', 'title', 'codexType', 'aliases', 'tags', 'created', 'updated'] as const

export const CodexFieldSchema = z.object({
  /** Frontmatter key, e.g. `role` or `relationships`. */
  key: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,39}$/).refine(key => !(RESERVED_CODEX_KEYS as readonly string[]).includes(key), 'Reserved key'),
  label: z.string().min(1).max(60),
  kind: CodexFieldKindSchema.default('text'),
  required: z.boolean().default(false),
  /** Choices for `select`. */
  options: z.array(z.string().min(1)).optional(),
  hint: z.string().max(200).optional(),
})
export type CodexField = z.infer<typeof CodexFieldSchema>

/** A type template: which fields an entry of this type has (stored as `codex/_types/<id>.yaml` for custom types). */
export const CodexTypeTemplateSchema = z.object({
  id: CodexTypeIdSchema,
  label: z.string().min(1).max(40),
  /** Plural label for lists, e.g. "Characters". */
  plural: z.string().min(1).max(40),
  icon: z.string().default('i-lucide-book-open'),
  /** Folder under `codex/` where new entries are created. */
  folder: z.string().regex(/^[a-z0-9-]+$/),
  fields: z.array(CodexFieldSchema).default([]),
  builtIn: z.boolean().default(false),
})
export type CodexTypeTemplate = z.infer<typeof CodexTypeTemplateSchema>

const field = (key: string, label: string, kind: CodexFieldKind = 'text', extra: Partial<CodexField> = {}): CodexField =>
  ({ key, label, kind, required: false, ...extra })

export const BUILT_IN_CODEX_TYPES: CodexTypeTemplate[] = [
  {
    id: 'character', label: 'Character', plural: 'Characters', icon: 'i-lucide-user-round', folder: 'characters', builtIn: true,
    fields: [
      field('role', 'Role', 'select', { options: ['protagonist', 'antagonist', 'supporting', 'minor'] }),
      field('age', 'Age'),
      field('appearance', 'Appearance', 'longtext'),
      field('personality', 'Personality', 'longtext'),
      field('goals', 'Goals', 'longtext'),
      field('relationships', 'Relationships', 'entries', { hint: 'Other codex entries this character is connected to' }),
    ],
  },
  {
    id: 'place', label: 'Place', plural: 'Places', icon: 'i-lucide-map-pin', folder: 'places', builtIn: true,
    fields: [field('region', 'Region'), field('atmosphere', 'Atmosphere', 'longtext'), field('features', 'Notable features', 'list')],
  },
  {
    id: 'item', label: 'Item', plural: 'Items', icon: 'i-lucide-gem', folder: 'items', builtIn: true,
    fields: [field('owner', 'Owner', 'entry'), field('significance', 'Significance', 'longtext')],
  },
  {
    id: 'faction', label: 'Faction', plural: 'Factions', icon: 'i-lucide-flag', folder: 'factions', builtIn: true,
    fields: [field('leader', 'Leader', 'entry'), field('members', 'Members', 'entries'), field('goals', 'Goals', 'longtext')],
  },
  {
    id: 'lore', label: 'Lore', plural: 'Lore', icon: 'i-lucide-scroll-text', folder: 'lore', builtIn: true,
    fields: [field('era', 'Era'), field('summary', 'Summary', 'longtext')],
  },
  {
    id: 'glossary', label: 'Glossary term', plural: 'Glossary', icon: 'i-lucide-book-a', folder: 'glossary', builtIn: true,
    fields: [field('definition', 'Definition', 'longtext')],
  },
]

/** A field value as stored in frontmatter. */
export const CodexFieldValueSchema = z.union([z.string().max(20_000), z.array(z.string().max(500)).max(200), z.null()])

export const CreateCodexEntrySchema = z.object({
  type: CodexTypeIdSchema,
  title: z.string().trim().min(1).max(200),
})

export interface CodexEntrySummary {
  id: string
  path: string
  title: string
  codexType: string
  aliases: string[]
  tags: string[]
  /** Short description (start of the body). */
  excerpt: string
}

export const CodexQuerySchema = z.object({
  type: CodexTypeIdSchema.optional(),
  tag: z.string().trim().min(1).max(60).optional(),
  /** Matches title or alias (prefix, case-insensitive) and full text. */
  q: z.string().trim().max(200).optional(),
})
export type CodexQuery = z.infer<typeof CodexQuerySchema>
