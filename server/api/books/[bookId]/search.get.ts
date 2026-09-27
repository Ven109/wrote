import { z } from 'zod'
import { EntryTypeSchema } from '#shared/schemas/entry'
import { searchEntries } from '../../../db/queries'

const toList = (value: unknown) => (value === undefined ? undefined : Array.isArray(value) ? value : [value])

const QuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
  type: z.preprocess(toList, z.array(EntryTypeSchema).optional()),
  tag: z.preprocess(toList, z.array(z.string()).optional()),
  status: z.preprocess(toList, z.array(z.string()).optional()),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

/** Full-text search across all entries of a book. */
export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, QuerySchema.parse)
  const book = await requireBook(event)
  return searchEntries(book.db, query.q, { types: query.type, tags: query.tag, status: query.status, limit: query.limit })
})
