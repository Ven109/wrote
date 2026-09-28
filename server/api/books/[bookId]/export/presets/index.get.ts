import { listPresets } from '../../../../../services/export-presets'

/** Built-in and book export presets; unreadable preset files are listed under `errors`. */
export default defineEventHandler(async (event) => {
  const book = await requireBook(event)
  return listPresets(book)
})
