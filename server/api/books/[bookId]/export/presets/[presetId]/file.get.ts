import { z } from 'zod'
import { PresetIdSchema } from '#shared/schemas/export-preset'
import { exportPresetFile } from '../../../../../../services/export-presets'

/** A preset as a YAML file to share with other books. */
export default defineEventHandler(async (event) => {
  const { presetId } = await getValidatedRouterParams(event, z.object({ presetId: PresetIdSchema }).parse)
  const book = await requireBook(event)
  const file = await withStorageErrors(() => exportPresetFile(book, presetId))
  setResponseHeaders(event, { 'content-type': 'application/yaml; charset=utf-8', 'content-disposition': `attachment; filename="${file.filename}"` })
  return file.yaml
})
