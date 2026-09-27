import { z } from 'zod'
import { EntryIdSchema } from '#shared/schemas/entry'
import { appearsIn } from '../../../../services/mentions'

const QuerySchema = z.object({ id: EntryIdSchema })

/** Scenes that mention a codex entry (by title or alias), with counts. */
export default defineEventHandler(async (event) => {
  const { id } = await getValidatedQuery(event, QuerySchema.parse)
  const book = await requireBook(event)
  return withStorageErrors(() => appearsIn(book, id))
})
