import { z } from 'zod'
import { PresetIdSchema } from '#shared/schemas/export-preset'
import { deletePreset } from '../../../../../../services/export-presets'

/** Deletes a book preset (built-ins cannot be deleted). */
export default defineEventHandler(async (event) => {
  const { presetId } = await getValidatedRouterParams(event, z.object({ presetId: PresetIdSchema }).parse)
  const book = await requireBook(event)
  await withStorageErrors(() => deletePreset(book, presetId))
  setResponseStatus(event, 204)
  return null
})
