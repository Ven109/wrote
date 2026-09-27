import { SaveDocumentSchema } from '#shared/schemas/document'
import { saveDocumentBody } from '../../../services/documents'

/** Saves an entry body. Responds 409 when the file changed since `expectedHash`. */
export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(event, SaveDocumentSchema.parse)
  const book = await requireBook(event)
  return withStorageErrors(() => saveDocumentBody(book, input))
})
