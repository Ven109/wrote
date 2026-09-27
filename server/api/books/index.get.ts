import { listBooks } from '../../services/books'

/** Lists all books in the workspace, most recently changed first. */
export default defineEventHandler(event => withStorageErrors(() => listBooks(useWorkspaceDir(event))))
