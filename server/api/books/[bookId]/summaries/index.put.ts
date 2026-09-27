import { UpdateSummarySchema } from '#shared/schemas/summaries'
import { writeManualSummary } from '../../../../services/summary-edits'

/** Saves the author's own summary; background jobs never overwrite it. */
export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(event, UpdateSummarySchema.parse)
  const book = await requireBook(event)
  return withStorageErrors(() => writeManualSummary(book, input.entryId, input.text))
})
