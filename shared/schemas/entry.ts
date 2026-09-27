import { z } from 'zod'

export const ENTRY_TYPES = ['part', 'chapter', 'scene', 'note', 'codex', 'research', 'outline', 'style-guide'] as const
export const EntryTypeSchema = z.enum(ENTRY_TYPES)
export type EntryType = z.infer<typeof EntryTypeSchema>

export const SCENE_STATUSES = ['idea', 'draft', 'revised', 'final'] as const
export const SceneStatusSchema = z.enum(SCENE_STATUSES)
export type SceneStatus = z.infer<typeof SceneStatusSchema>

export const CODEX_TYPES = ['character', 'place', 'item', 'faction', 'lore', 'glossary'] as const
export const CodexTypeSchema = z.enum(CODEX_TYPES)
export type CodexType = z.infer<typeof CodexTypeSchema>

export const EntryIdSchema = z.string().regex(/^[a-z]+_[a-z0-9]{6,}$/, 'Expected an id like "scn_k3j9x2m1q0"')

/** Fields every entry shares. Unknown fields are preserved (passthrough). */
export const BaseFrontmatterSchema = z.looseObject({
  id: EntryIdSchema,
  title: z.string().min(1),
  tags: z.array(z.string()).default([]),
  created: z.iso.datetime().optional(),
  updated: z.iso.datetime().optional(),
})

export const PartFrontmatterSchema = BaseFrontmatterSchema.extend({
  synopsis: z.string().optional(),
})

export const ChapterFrontmatterSchema = BaseFrontmatterSchema.extend({
  synopsis: z.string().optional(),
})

export const SceneFrontmatterSchema = BaseFrontmatterSchema.extend({
  status: SceneStatusSchema.default('draft'),
  pov: z.string().optional(),
  location: z.string().optional(),
  timeline: z.string().optional(),
  synopsis: z.string().optional(),
})

export const NoteFrontmatterSchema = BaseFrontmatterSchema.extend({
  pinned: z.boolean().default(false),
})

export const CodexFrontmatterSchema = BaseFrontmatterSchema.extend({
  codexType: CodexTypeSchema,
  aliases: z.array(z.string()).default([]),
})

export const ResearchFrontmatterSchema = BaseFrontmatterSchema.extend({
  source: z.string().optional(),
  url: z.url().optional(),
  author: z.string().optional(),
})

export const DocumentFrontmatterSchema = BaseFrontmatterSchema

export const FRONTMATTER_SCHEMAS = {
  'part': PartFrontmatterSchema,
  'chapter': ChapterFrontmatterSchema,
  'scene': SceneFrontmatterSchema,
  'note': NoteFrontmatterSchema,
  'codex': CodexFrontmatterSchema,
  'research': ResearchFrontmatterSchema,
  'outline': DocumentFrontmatterSchema,
  'style-guide': DocumentFrontmatterSchema,
} as const satisfies Record<EntryType, z.ZodType>

export type PartFrontmatter = z.infer<typeof PartFrontmatterSchema>
export type ChapterFrontmatter = z.infer<typeof ChapterFrontmatterSchema>
export type SceneFrontmatter = z.infer<typeof SceneFrontmatterSchema>
export type NoteFrontmatter = z.infer<typeof NoteFrontmatterSchema>
export type CodexFrontmatter = z.infer<typeof CodexFrontmatterSchema>
export type ResearchFrontmatter = z.infer<typeof ResearchFrontmatterSchema>

export type FrontmatterByType = { [K in EntryType]: z.infer<(typeof FRONTMATTER_SCHEMAS)[K]> }

/** An entry as loaded from disk: typed frontmatter + Markdown body + book-relative POSIX path. */
export interface Entry<T extends EntryType = EntryType> {
  type: T
  path: string
  frontmatter: FrontmatterByType[T]
  body: string
}

export function parseFrontmatter<T extends EntryType>(type: T, data: unknown): FrontmatterByType[T] {
  return FRONTMATTER_SCHEMAS[type].parse(data) as FrontmatterByType[T]
}
