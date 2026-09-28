import { SavePresetSchema } from '#shared/schemas/export-preset'
import { savePreset } from '../../../../../services/export-presets'

/** Saves a book preset (`.wrote/presets/<id>.yaml`). */
export default defineEventHandler(async (event) => {
  const { id, preset } = await readValidatedBody(event, SavePresetSchema.parse)
  const book = await requireBook(event)
  setResponseStatus(event, 201)
  return withStorageErrors(() => savePreset(book, id, preset))
})
