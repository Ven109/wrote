import { z } from 'zod'
import { EntryPathSchema } from '#shared/schemas/document'
import { triageNote } from '../../../../services/triage'

const QuerySchema = z.object({ path: EntryPathSchema })

/** Triage suggestions (tags, codex links, target chapter) for a note. */
export default defineEventHandler(async (event) => {
  const { path } = await getValidatedQuery(event, QuerySchema.parse)
  const book = await requireBook(event)
  return withStorageErrors(() => triageNote(book, path))
})
