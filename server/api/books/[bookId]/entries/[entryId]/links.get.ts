import { z } from 'zod'
import { EntryIdSchema } from '#shared/schemas/entry'
import { outgoingLinks } from '../../../../../db/queries'
import { backlinksWithContext } from '../../../../../services/links'

const ParamsSchema = z.object({ bookId: z.string(), entryId: EntryIdSchema })

/** Backlinks (with context snippets) and outgoing links of an entry. */
export default defineEventHandler(async (event) => {
  const { entryId } = await getValidatedRouterParams(event, ParamsSchema.parse)
  const book = await requireBook(event)
  const [incoming, outgoing] = await Promise.all([backlinksWithContext(book, entryId), outgoingLinks(book.db, entryId)])
  return { backlinks: incoming, outgoing: outgoing.resolved, unresolved: outgoing.unresolved }
})
