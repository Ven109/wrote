import { listLinkables } from '../../../../services/links'

/** Entries that can be linked to (the `[[` picker). */
export default defineEventHandler(async (event) => {
  const book = await requireBook(event)
  return withStorageErrors(() => listLinkables(book))
})
