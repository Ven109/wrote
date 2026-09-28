import { listBookLocations, openBook, type BookContext } from '../services/workspace'
import { ToolError } from '../tools/define'
import type { WroteMcpOptions } from './server'

/** Resolves the book for a call: explicit id, the server's default book, or the only book in the workspace. */
export async function resolveBook(options: WroteMcpOptions, bookId: string | undefined): Promise<BookContext> {
  const id = bookId ?? options.defaultBookId
  if (id) return openBook(options.workspaceDir, id)
  const books = await listBookLocations(options.workspaceDir)
  if (books.length === 1) return openBook(options.workspaceDir, books[0]!.id)
  throw new ToolError(books.length ? 'Several books exist: pass bookId (see list_books).' : 'No books yet: create one in Wrote first.', 'book_required')
}
