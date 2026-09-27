/** Active and recently finished background jobs of the book. */
export default defineEventHandler(async (event) => {
  const book = await requireBook(event)
  return withStorageErrors(() => book.jobs.list())
})
