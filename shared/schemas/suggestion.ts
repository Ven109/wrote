import { z } from 'zod'
import { EntryIdSchema } from './entry'

export const SuggestionStatusSchema = z.enum(['pending', 'accepted', 'rejected', 'stale'])

export const ActorSchema = z.object({
  kind: z.enum(['user', 'assistant', 'mcp', 'agent']),
  name: z.string().min(1),
})
export type Actor = z.infer<typeof ActorSchema>

/**
 * A proposed text change to an entry. `find` anchors the change (exact text currently in the
 * entry body); `replace` is the proposed text. Applied only when the author accepts it.
 */
export const SuggestionSchema = z.object({
  id: z.string().regex(/^sug_[a-z0-9]{10}$/),
  entryId: EntryIdSchema,
  find: z.string().min(1),
  replace: z.string(),
  rationale: z.string().optional(),
  author: ActorSchema,
  status: SuggestionStatusSchema.default('pending'),
  createdAt: z.iso.datetime(),
  resolvedAt: z.iso.datetime().optional(),
})
export type Suggestion = z.infer<typeof SuggestionSchema>
