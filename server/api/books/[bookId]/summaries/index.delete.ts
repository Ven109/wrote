import { z } from 'zod'
import { SummaryEntryIdSchema } from '#shared/schemas/summaries'
import { resetSummary } from '../../../../services/summary-edits'

/** Resets a summary to automatic: drops it (and its manual lock) and queues a fresh one. */
export default defineEventHandler(async (event) => {
  const { entryId } = await getValidatedQuery(event, z.object({ entryId: SummaryEntryIdSchema }).parse)
  const book = await requireBook(event)
  await withStorageErrors(() => resetSummary(book, entryId))
  setResponseStatus(event, 204)
  return null
})
