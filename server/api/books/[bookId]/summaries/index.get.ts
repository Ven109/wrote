import { SummaryQuerySchema } from '#shared/schemas/summaries'
import { readSummaries, readSummary } from '../../../../services/summary-edits'

/** One summary (`?entryId=` → `{ summary }`, `null` if there is none yet) or all summaries of the book. */
export default defineEventHandler(async (event) => {
  const { entryId } = await getValidatedQuery(event, SummaryQuerySchema.parse)
  const book = await requireBook(event)
  return entryId ? { summary: await readSummary(book, entryId) } : readSummaries(book)
})
