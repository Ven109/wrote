import { z } from 'zod'
import { BookConfigSchema } from './book'

export const CreateBookSchema = z.object({
  title: z.string().trim().min(1, 'Give your book a title').max(200),
  author: z.string().trim().max(200).optional(),
  language: z.string().trim().min(2).max(35).default('en'),
  template: z.enum(['novel', 'non-fiction', 'blank']).default('novel'),
})
export type CreateBookInput = z.input<typeof CreateBookSchema>

export const OpenFolderSchema = z.object({
  path: z.string().trim().min(1, 'Enter the folder path'),
})

export const UpdateBookSchema = BookConfigSchema.pick({ title: true, subtitle: true, author: true, language: true, export: true, snapshots: true, goals: true }).partial()
export type UpdateBookInput = z.infer<typeof UpdateBookSchema>

export interface BookSummary {
  id: string
  title: string
  subtitle: string | null
  author: string | null
  language: string
  template: string
  external: boolean
  wordCount: number
  scenes: number
  updatedAt: string | null
  /** How export treats each custom block type (defaults merged with the book's settings). */
  blockExport: Record<string, 'include' | 'strip'>
  /** Manual snapshots are committed to git (when the folder is a repository). */
  snapshotGit: boolean
}
