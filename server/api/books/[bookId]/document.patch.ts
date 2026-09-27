import { UpdateDocumentMetaSchema } from '#shared/schemas/document'
import { updateDocumentMeta } from '../../../services/documents'

/** Updates an entry's metadata (frontmatter fields) without touching its body. */
export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(event, UpdateDocumentMetaSchema.parse)
  const book = await requireBook(event)
  return withStorageErrors(() => updateDocumentMeta(book, input))
})
