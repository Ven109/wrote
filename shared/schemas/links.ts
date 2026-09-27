import { z } from 'zod'
import type { EntryType } from './entry'

/** A resolved reference to an entry. */
export interface LinkRef {
  id: string
  path: string
  type: EntryType
  title: string
}

export interface Backlink extends LinkRef {
  /** Text around the link in the source entry. */
  context: string | null
}

export const ResolveLinksQuerySchema = z.object({
  targets: z.union([z.string(), z.array(z.string())])
    .transform(value => (Array.isArray(value) ? value : [value]))
    .pipe(z.array(z.string().trim().min(1).max(200)).max(200)),
})
