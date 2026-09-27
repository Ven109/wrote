import { listCodexTypes } from '../../../../codex/types'

/** Codex type templates (built-in + custom) and custom type files that failed to load. */
export default defineEventHandler(async (event) => {
  const book = await requireBook(event)
  return withStorageErrors(() => listCodexTypes(book.root))
})
