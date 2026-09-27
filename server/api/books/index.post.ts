import { CreateBookSchema } from '#shared/schemas/library'
import { createBook } from '../../services/books'

/** Creates a new book from a template. Returns the book and the path of its first scene. */
export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(event, CreateBookSchema.parse)
  setResponseStatus(event, 201)
  return withStorageErrors(() => createBook(useWorkspaceDir(event), input))
})
