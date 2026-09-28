import { ExportRequestSchema } from '#shared/schemas/export'
import { MissingToolError } from '../../../../export/tools'
import { exportBook } from '../../../../services/export'

/** Exports the book and returns the file (download). 409 `export_tool_missing` names the missing tools with install hints. */
export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(event, ExportRequestSchema.parse)
  const book = await requireBook(event)
  const controller = new AbortController()
  event.node.req.on('close', () => controller.abort())
  try {
    const file = await withStorageErrors(() => exportBook(book, input, controller.signal))
    setResponseHeaders(event, {
      'content-type': file.contentType,
      'content-disposition': `attachment; filename="${file.filename}"`,
      'content-length': file.data.length,
    })
    return file.data
  }
  catch (error) {
    if (error instanceof MissingToolError) throw createError({ statusCode: 409, statusMessage: error.message, data: { code: 'export_tool_missing', tools: error.tools, install: error.install } })
    throw error
  }
})
