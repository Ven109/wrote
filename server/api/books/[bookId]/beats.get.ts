import { z } from 'zod'
import { listBeats } from '../../../services/outline'

const QuerySchema = z.object({ sceneId: z.string().regex(/^scn_[a-z0-9]+$/).optional() })

/** Outline beats from the index – all, or the ones a scene tells. */
export default defineEventHandler(async (event) => {
  const filter = await getValidatedQuery(event, QuerySchema.parse)
  const book = await requireBook(event)
  return listBeats(book, filter)
})
