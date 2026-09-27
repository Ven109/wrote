import { UpdateBookSchema } from '#shared/schemas/library'
import { updateBook } from '../../../services/books'

/** Updates book settings (title, subtitle, author, language) in wrote.json. */
export default defineEventHandler(async (event) => {
  const changes = await readValidatedBody(event, UpdateBookSchema.parse)
  return withStorageErrors(() => updateBook(useWorkspaceDir(event), getRouterParam(event, 'bookId') ?? '', changes))
})
