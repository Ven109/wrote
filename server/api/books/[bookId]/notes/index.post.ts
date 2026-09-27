import { CaptureNoteSchema } from '#shared/schemas/notes'
import { captureNote } from '../../../../services/notes'

/** Quick capture: creates a note in the inbox. */
export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(event, CaptureNoteSchema.parse)
  const book = await requireBook(event)
  setResponseStatus(event, 201)
  return withStorageErrors(() => captureNote(book, input))
})
