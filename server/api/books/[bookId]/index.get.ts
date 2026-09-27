import { getBookSummary } from '../../../services/books'

export default defineEventHandler(event =>
  withStorageErrors(() => getBookSummary(useWorkspaceDir(event), getRouterParam(event, 'bookId') ?? '')),
)
