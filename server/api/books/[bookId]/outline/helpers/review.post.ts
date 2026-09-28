import { ReviewOutlineSchema } from '#shared/schemas/outline-proposals'
import { generateWith, OUTLINE_HELPER, reviewOutline } from '../../../../../services/outline-helpers'

/** "Find plot holes" / "What's missing in act N": notes and beats as proposals (Wrote's chat model). */
export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(event, ReviewOutlineSchema.parse)
  const book = await requireBook(event)
  const { model, ref } = await requireChatModel(book.workspaceDir)
  return withStorageErrors(() => reviewOutline(book, input, { generate: generateWith(model), model: ref, author: OUTLINE_HELPER }))
})
