import { CodexTypeTemplateSchema } from '#shared/schemas/codex'
import { listCodexTypes, saveCustomType } from '../../../../codex/types'

const CreateTypeSchema = CodexTypeTemplateSchema.omit({ builtIn: true })

/** Adds (or replaces) a custom codex type, stored as `codex/_types/<id>.yaml`. */
export default defineEventHandler(async (event) => {
  const template = await readValidatedBody(event, CreateTypeSchema.parse)
  const book = await requireBook(event)
  if ((await listCodexTypes(book.root)).types.some(type => type.builtIn && type.id === template.id)) {
    throw createError({ statusCode: 409, statusMessage: `"${template.id}" is a built-in type`, data: { code: 'conflict' } })
  }
  await saveCustomType(book.root, { ...template, builtIn: false })
  setResponseStatus(event, 201)
  return listCodexTypes(book.root)
})
