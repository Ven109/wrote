import { z } from 'zod'
import { EntryTypeSchema } from '#shared/schemas/entry'
import { searchBook } from '../../../services/search'

const toList = (value: unknown) => (value === undefined ? undefined : Array.isArray(value) ? value : [value])

const QuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
  type: z.preprocess(toList, z.array(EntryTypeSchema).optional()),
  tag: z.preprocess(toList, z.array(z.string()).optional()),
  status: z.preprocess(toList, z.array(z.string()).optional()),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  semantic: z.enum(['true', 'false']).default('true').transform(value => value === 'true'),
})

/** Hybrid search across all entries of a book: full-text plus meaning (when embeddings are set up). */
export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, QuerySchema.parse)
  const book = await requireBook(event)
  return searchBook(book, query.q, { types: query.type, tags: query.tag, status: query.status, limit: query.limit, semantic: query.semantic })
})
