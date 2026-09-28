import { ApplyOutlineOpsSchema } from '#shared/schemas/outline'
import { updateOutline } from '../../../../services/outline'

/** Applies structural edits (add, rename, move, delete acts and beats). 409 when the file changed since `expectedHash`. */
export default defineEventHandler(async (event) => {
  const { ops, expectedHash } = await readValidatedBody(event, ApplyOutlineOpsSchema.parse)
  const book = await requireBook(event)
  return withStorageErrors(() => updateOutline(book, ops, expectedHash))
})
