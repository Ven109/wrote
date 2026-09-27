import { ResolveLinksQuerySchema } from '#shared/schemas/links'
import { resolveTargets } from '../../../../services/links'

/** Resolves `?targets=` (repeatable) to entries; unknown targets map to `null`. */
export default defineEventHandler(async (event) => {
  const { targets } = await getValidatedQuery(event, ResolveLinksQuerySchema.parse)
  const book = await requireBook(event)
  return withStorageErrors(() => resolveTargets(book, targets))
})
