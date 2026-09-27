import { FileNoteSchema } from '#shared/schemas/notes'
import { fileNote } from '../../../../services/notes'

/** Moves an inbox note into `notes/`. */
export default defineEventHandler(async (event) => {
  const { path } = await readValidatedBody(event, FileNoteSchema.parse)
  const book = await requireBook(event)
  return withStorageErrors(() => fileNote(book, path))
})
