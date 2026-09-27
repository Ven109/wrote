import { CreateCodexEntrySchema } from '#shared/schemas/codex'
import { createCodexEntry } from '../../../../services/codex'

/** Creates a codex entry of a (built-in or custom) type. */
export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(event, CreateCodexEntrySchema.parse)
  const book = await requireBook(event)
  setResponseStatus(event, 201)
  return withStorageErrors(() => createCodexEntry(book, input))
})
