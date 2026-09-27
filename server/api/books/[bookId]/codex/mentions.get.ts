import { mentionTargets } from '../../../../services/mentions'

/** Codex names/aliases to detect in the editor, with hover-card data. */
export default defineEventHandler(async (event) => {
  const book = await requireBook(event)
  return withStorageErrors(() => mentionTargets(book))
})
