import { ExtractCodexSchema } from '#shared/schemas/codex-proposals'
import { getModel } from '../../../../ai/models'
import { EXTRACT_CODEX_JOB, manuscriptText } from '../../../../services/codex-extraction'

/** Starts "Scan chapter" as a background job (202 with the job); proposals arrive when it finishes. */
export default defineEventHandler(async (event) => {
  const { entryId } = await readValidatedBody(event, ExtractCodexSchema.parse)
  const book = await requireBook(event)
  if (!await getModel(book.workspaceDir, 'extraction')) throw createError({ statusCode: 400, statusMessage: 'Set up an AI model first (AI models in the sidebar)', data: { code: 'ai_not_configured' } })
  await withStorageErrors(() => manuscriptText(book, entryId))
  setResponseStatus(event, 202)
  return book.jobs.enqueue(EXTRACT_CODEX_JOB, { entryId }, { unique: true })
})
