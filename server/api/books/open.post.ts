import { OpenFolderSchema } from '#shared/schemas/library'
import { openFolderAsBook } from '../../services/books'

/** Adds an existing folder (absolute path on the server) as a book. */
export default defineEventHandler(async (event) => {
  const { path } = await readValidatedBody(event, OpenFolderSchema.parse)
  return withStorageErrors(() => openFolderAsBook(useWorkspaceDir(event), path))
})
