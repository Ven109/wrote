import { readOutline } from '../../../../services/outline'

/** The plot outline (acts → beats with linked scenes) and the hash of `outline.md`. */
export default defineEventHandler(async (event) => {
  const book = await requireBook(event)
  return withStorageErrors(() => readOutline(book))
})
