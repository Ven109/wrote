import { CodexQuerySchema } from '#shared/schemas/codex'
import { listCodex } from '../../../../services/codex'

/** Codex entries, filterable by `type`, `tag` and `q` (name, alias or full text). */
export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, CodexQuerySchema.parse)
  const book = await requireBook(event)
  return withStorageErrors(() => listCodex(book, query))
})
