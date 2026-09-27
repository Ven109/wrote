import { z } from 'zod'
import type { EntryType } from './entry'

/** Book-relative POSIX path of a Markdown entry. Traversal is rejected server-side by `resolveInBook`. */
export const EntryPathSchema = z.string().trim().min(1).max(500).regex(/\.md$/, 'Expected a Markdown file path')

export const DocumentQuerySchema = z.object({ path: EntryPathSchema })

export const SaveDocumentSchema = z.object({
  path: EntryPathSchema,
  /** Markdown body without frontmatter. */
  body: z.string().max(5_000_000),
  /** Hash of the version the client edited; a mismatch is a 409 conflict. */
  expectedHash: z.string().optional(),
})
export type SaveDocumentInput = z.infer<typeof SaveDocumentSchema>

/** An entry opened in the editor: its body plus what the editor chrome needs. */
export interface EntryDocument {
  id: string
  path: string
  type: EntryType
  title: string
  body: string
  hash: string
}
