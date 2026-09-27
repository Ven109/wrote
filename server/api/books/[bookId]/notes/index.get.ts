import { NotesQuerySchema } from '#shared/schemas/notes'
import { listNotes } from '../../../../services/notes'

/** Notes list with `filter` (all/inbox/pinned/recent), `tag` and `q` (full text). */
export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, NotesQuerySchema.parse)
  const book = await requireBook(event)
  return withStorageErrors(() => listNotes(book, query))
})
