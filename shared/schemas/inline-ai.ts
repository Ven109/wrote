import { z } from 'zod'
import { EntryPathSchema } from './document'

export const INLINE_ACTIONS = ['continue', 'rephrase', 'expand', 'tighten', 'show', 'tone', 'translate', 'custom'] as const
export const InlineActionSchema = z.enum(INLINE_ACTIONS)
export type InlineAction = z.infer<typeof InlineActionSchema>

export const INLINE_ACTION_LABELS: Record<InlineAction, string> = {
  continue: 'Continue writing',
  rephrase: 'Rephrase',
  expand: 'Expand',
  tighten: 'Tighten',
  show: 'Show, don\'t tell',
  tone: 'Change tone',
  translate: 'Translate',
  custom: 'Ask AI',
}

export const TONES = ['warmer', 'darker', 'more formal', 'more casual', 'more tense', 'lighter', 'more lyrical'] as const
export const LANGUAGES = ['English', 'German', 'French', 'Spanish', 'Italian', 'Portuguese', 'Dutch', 'Polish', 'Japanese', 'Chinese'] as const

/**
 * An inline AI action on a passage of the open entry. `find` is the passage (Markdown, exactly as in the
 * saved body); `mode` says whether the result replaces it or is added after its paragraph (continue).
 * `param` is the tone, the target language or the author's own instruction.
 */
export const InlineAiRequestSchema = z.object({
  entryPath: EntryPathSchema,
  action: InlineActionSchema,
  find: z.string().min(1).max(20_000),
  mode: z.enum(['replace', 'insert']),
  param: z.string().trim().max(500).optional(),
}).refine(input => !['tone', 'translate', 'custom'].includes(input.action) || Boolean(input.param), { message: 'This action needs a parameter', path: ['param'] })
export type InlineAiRequest = z.infer<typeof InlineAiRequestSchema>

/** Ghost-text autocomplete: the text before the cursor in the open entry. */
export const AutocompleteRequestSchema = z.object({
  entryPath: EntryPathSchema,
  before: z.string().min(1).max(4000),
})
export type AutocompleteRequest = z.infer<typeof AutocompleteRequestSchema>
