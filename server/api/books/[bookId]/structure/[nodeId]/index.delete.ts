import { z } from 'zod'
import { EntryIdSchema } from '#shared/schemas/entry'
import { trashNode } from '../../../../../services/manuscript'

/** Moves a part, chapter or scene (with its children) to the book's trash. */
export default defineEventHandler(async (event) => {
  const { nodeId } = await getValidatedRouterParams(event, z.object({ nodeId: EntryIdSchema }).parse)
  const book = await requireBook(event)
  await withStorageErrors(() => trashNode(book, nodeId))
  setResponseStatus(event, 204)
  return null
})
