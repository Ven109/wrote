import { getStructure } from '../../../services/structure'

/** Manuscript tree: parts → chapters → scenes with status and word counts. */
export default defineEventHandler(async (event) => {
  const book = await requireBook(event)
  return getStructure(book.db)
})
