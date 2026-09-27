import { z } from 'zod'
import { EntryIdSchema } from '#shared/schemas/entry'
import { backlinks, outgoingLinks } from '../../../../../db/queries'

const ParamsSchema = z.object({ bookId: z.string(), entryId: EntryIdSchema })

/** Backlinks and outgoing links of an entry. */
export default defineEventHandler(async (event) => {
  const { entryId } = await getValidatedRouterParams(event, ParamsSchema.parse)
  const book = await requireBook(event)
  const [incoming, outgoing] = await Promise.all([backlinks(book.db, entryId), outgoingLinks(book.db, entryId)])
  return { backlinks: incoming, outgoing: outgoing.resolved, unresolved: outgoing.unresolved }
})
