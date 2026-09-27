import { noteCounts } from '../../../../services/notes'

/** Note counts per filter and tag (sidebar badge, filter chips). */
export default defineEventHandler(async (event) => {
  const book = await requireBook(event)
  return withStorageErrors(() => noteCounts(book))
})
