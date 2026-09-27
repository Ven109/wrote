import { UpdateCodexEntrySchema, updateCodexEntry } from '../../../../services/codex'

/** Updates a codex entry's template fields and aliases (validated against its type). */
export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(event, UpdateCodexEntrySchema.parse)
  const book = await requireBook(event)
  return withStorageErrors(() => updateCodexEntry(book, input))
})
