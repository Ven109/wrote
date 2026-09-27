import { z } from 'zod'
import { EntryIdSchema } from '#shared/schemas/entry'
import { MoveNodeSchema } from '#shared/schemas/manuscript'
import { moveNode } from '../../../../../services/manuscript'

/** Reorders or moves a node; returns the updated structure. */
export default defineEventHandler(async (event) => {
  const { nodeId } = await getValidatedRouterParams(event, z.object({ nodeId: EntryIdSchema }).parse)
  const target = await readValidatedBody(event, MoveNodeSchema.parse)
  const book = await requireBook(event)
  return withStorageErrors(() => moveNode(book, nodeId, target))
})
