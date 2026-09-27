import { generateText, streamText, type LanguageModel } from 'ai'
import { INLINE_ACTION_LABELS, type AutocompleteRequest, type InlineAiRequest } from '#shared/schemas/inline-ai'
import { buildContext } from '../ai/context/build'
import { renderContext } from '../ai/context/render'
import { AUTOCOMPLETE_INSTRUCTIONS, inlineInstructions, inlinePrompt } from '../ai/inline-prompts'
import { saveContextSnapshot } from '../db/state/context-snapshots'
import { InvalidInputError } from '../storage/errors'
import { createSuggestion } from './suggestions'
import type { BookContext } from './workspace'

export interface InlineModel {
  model: LanguageModel
  ref: string
}

/** Builds the prompt for an inline action through the context engine and stores its snapshot. */
async function preparePrompt(book: BookContext, input: InlineAiRequest, ref: string, now: Date) {
  const built = await buildContext(book, { entryPath: input.entryPath, selection: input.find, query: input.param ?? input.find.slice(0, 500), model: ref })
  const system = [inlineInstructions(input.action, input.param), renderContext(built.items)].filter(Boolean).join('\n\n')
  return saveContextSnapshot(book.state, { feature: `inline:${input.action}`, model: ref, ...built, system }, now)
}

/**
 * Runs an inline action (continue, rephrase, …) and streams the text back for a live preview. The result is
 * never inserted: when the model finishes it becomes a pending suggestion the author accepts or rejects.
 */
export async function streamInlineAction(book: BookContext, input: InlineAiRequest, configured: InlineModel, options: { abortSignal?: AbortSignal, now?: Date } = {}): Promise<Response> {
  const entry = await book.repository.read(input.entryPath)
  const occurrences = entry.body.split(input.find).length - 1
  if (occurrences !== 1) throw new InvalidInputError(occurrences ? 'The passage occurs more than once – select a longer passage' : 'The passage is not in the saved text – wait for it to save and try again')
  const snapshot = await preparePrompt(book, input, configured.ref, options.now ?? new Date())
  const label = INLINE_ACTION_LABELS[input.action]
  const result = streamText({
    model: configured.model,
    system: snapshot.system,
    prompt: inlinePrompt(input.action, input.find),
    abortSignal: options.abortSignal,
    onFinish: async ({ text, finishReason }) => {
      if (finishReason === 'error' || !text.trim()) return
      await createSuggestion(book, {
        entryId: entry.frontmatter.id,
        kind: input.mode,
        find: input.find,
        replace: text.trim(),
        rationale: input.param ? `${label}: ${input.param}` : label,
        author: { kind: 'assistant', name: `AI · ${label}` },
      }).catch(error => console.warn('[wrote] inline action: could not store the suggestion', error))
    },
  })
  return result.toTextStreamResponse({ headers: { 'x-context-snapshot': snapshot.id } })
}

/** A short ghost-text completion at the cursor (shown greyed out; Tab accepts it in the editor). */
export async function completeText(book: BookContext, input: AutocompleteRequest, configured: InlineModel, abortSignal?: AbortSignal): Promise<string> {
  const built = await buildContext(book, { entryPath: input.entryPath, query: input.before.slice(-300), model: configured.ref })
  const system = [AUTOCOMPLETE_INSTRUCTIONS, renderContext(built.items)].filter(Boolean).join('\n\n')
  const { text } = await generateText({ model: configured.model, system, prompt: input.before, maxOutputTokens: 40, abortSignal, maxRetries: 0 })
  return text.replace(/\n[\s\S]*$/, '').slice(0, 200)
}
