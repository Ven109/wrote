import { listApprovals } from '../../../../services/approvals'

/** Tool calls on this book waiting for the author's approval. */
export default defineEventHandler(async (event) => {
  const book = await requireBook(event)
  return listApprovals(book.id)
})
