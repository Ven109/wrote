import { removeBook } from '../../../services/books'

/** Removes a book from the workspace (moved to .trash or unregistered – never deleted). */
export default defineEventHandler(async (event) => {
  await withStorageErrors(() => removeBook(useWorkspaceDir(event), getRouterParam(event, 'bookId') ?? ''))
  setResponseStatus(event, 204)
  return null
})
