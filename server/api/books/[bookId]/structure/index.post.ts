import { CreateNodeSchema } from '#shared/schemas/manuscript'
import { createNode } from '../../../../services/manuscript'

/** Creates a part, chapter or scene at the end of its parent. */
export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(event, CreateNodeSchema.parse)
  const book = await requireBook(event)
  setResponseStatus(event, 201)
  return withStorageErrors(() => createNode(book, input))
})
