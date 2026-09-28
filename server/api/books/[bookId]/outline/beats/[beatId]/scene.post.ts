import { z } from 'zod'
import { BeatIdSchema } from '#shared/schemas/outline'
import { createSceneForBeat } from '../../../../../../services/outline'

const ParamsSchema = z.object({ beatId: BeatIdSchema })
const BodySchema = z.object({ chapterId: z.string().regex(/^chp_[a-z0-9]+$/) })

/** Creates a scene from a beat in the given chapter and links them (201). */
export default defineEventHandler(async (event) => {
  const { beatId } = await getValidatedRouterParams(event, ParamsSchema.parse)
  const { chapterId } = await readValidatedBody(event, BodySchema.parse)
  const book = await requireBook(event)
  setResponseStatus(event, 201)
  return withStorageErrors(() => createSceneForBeat(book, beatId, chapterId))
})
