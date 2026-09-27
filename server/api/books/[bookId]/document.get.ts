import { DocumentQuerySchema } from '#shared/schemas/document'
import { readDocument } from '../../../services/documents'

/** The entry at `?path=` as an editor document (body + hash). */
export default defineEventHandler(async (event) => {
  const { path } = await getValidatedQuery(event, DocumentQuerySchema.parse)
  const book = await requireBook(event)
  return withStorageErrors(() => readDocument(book, path))
})
