import { goalProgress } from '../../../../services/writing'

/** Word target, deadline, daily target, today's writing, streaks and history (Goals page, header indicator). */
export default defineEventHandler(async (event) => {
  const book = await requireBook(event)
  return goalProgress(book)
})
