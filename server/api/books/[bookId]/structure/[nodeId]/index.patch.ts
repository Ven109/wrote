import { z } from 'zod'
import { EntryIdSchema } from '#shared/schemas/entry'
import { RenameNodeSchema } from '#shared/schemas/manuscript'
import { renameNode } from '../../../../../services/manuscript'

/** Renames a part, chapter or scene (title only – ids and links stay valid). */
export default defineEventHandler(async (event) => {
  const { nodeId } = await getValidatedRouterParams(event, z.object({ nodeId: EntryIdSchema }).parse)
  const { title } = await readValidatedBody(event, RenameNodeSchema.parse)
  const book = await requireBook(event)
  return withStorageErrors(() => renameNode(book, nodeId, title))
})
