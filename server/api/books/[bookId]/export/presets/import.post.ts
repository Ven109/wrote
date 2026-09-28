import { ImportPresetSchema } from '#shared/schemas/export-preset'
import { importPreset } from '../../../../../services/export-presets'

/** Imports a shared preset file (YAML); invalid files answer 400 with what is wrong. */
export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(event, ImportPresetSchema.parse)
  const book = await requireBook(event)
  setResponseStatus(event, 201)
  return withStorageErrors(() => importPreset(book, input))
})
