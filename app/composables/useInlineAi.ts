import { useQueryCache } from '@pinia/colada'
import type { Editor } from '@tiptap/vue-3'
import type { EntryDocument } from '#shared/schemas/document'
import { INLINE_ACTION_LABELS, type InlineAction, type InlineAiRequest } from '#shared/schemas/inline-ai'
import { INLINE_AI_CONTEXT, type InlineAiContext, type InlineAiTarget } from '~/editor/inline-ai-context'
import { blockMarkdown, previousTextBlockPos, selectionMarkdown } from '~/editor/selection-markdown'
import { bookKeys } from '~/queries/keys'

/** The passage and whether the result replaces it or follows it ("continue" adds after). */
export function inlineRequestFor(editor: Editor, action: InlineAction, target: InlineAiTarget): Pick<InlineAiRequest, 'find' | 'mode'> {
  const mode = action === 'continue' ? 'insert' : 'replace'
  if (target.kind === 'selection') return { find: selectionMarkdown(editor), mode }
  const find = blockMarkdown(editor, target.pos)
  // "Continue" from an empty line (slash menu) continues the paragraph above.
  const previous = !find && action === 'continue' ? previousTextBlockPos(editor, target.pos) : null
  return { find: previous === null ? find : blockMarkdown(editor, previous), mode }
}

/**
 * Inline AI actions of the write page: runs an action on the selection or a block, streams the text as a live
 * preview, and lets the result arrive as a suggestion (never a direct edit). `beforeRun` saves pending edits
 * first so the server finds the passage.
 */
export function useInlineAi(bookId: MaybeRefOrGetter<string>, document: Ref<EntryDocument | undefined>, beforeRun: () => Promise<unknown>) {
  const queryCache = useQueryCache()
  const toast = useToast()
  const running = ref<string | null>(null)
  const preview = ref('')
  const asking = shallowRef<{ editor: Editor, target: InlineAiTarget } | null>(null)
  const prompt = ref('')
  let controller: AbortController | null = null

  async function stream(request: InlineAiRequest) {
    controller = new AbortController()
    const response = await fetch(`/api/books/${encodeURIComponent(toValue(bookId))}/ai/inline`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal,
    })
    if (!response.ok || !response.body) {
      const data = await response.json().catch(() => ({})) as { statusMessage?: string, data?: { code?: string } }
      throw new Error(data.data?.code === 'ai_not_configured' ? 'No AI model is configured – choose one in AI settings.' : data.statusMessage ?? 'The AI request failed')
    }
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
    for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) preview.value += chunk.value
  }

  async function run(editor: Editor, action: InlineAction, target: InlineAiTarget, param?: string) {
    const doc = document.value
    if (!doc || running.value) return
    const { find, mode } = inlineRequestFor(editor, action, target)
    if (!find) {
      toast.add({ title: 'Select some text first', color: 'warning' })
      return
    }
    running.value = param ? `${INLINE_ACTION_LABELS[action]}: ${param}` : INLINE_ACTION_LABELS[action]
    preview.value = ''
    try {
      await beforeRun()
      await stream({ entryPath: doc.path, action, find, mode, ...(param ? { param } : {}) })
      toast.add({ title: 'Suggestion ready', description: 'Review it in the text: accept, edit or reject.', icon: 'i-lucide-sparkles', color: 'primary' })
    }
    catch (error) {
      if (!controller?.signal.aborted) toast.add({ title: 'AI action failed', description: error instanceof Error ? error.message : String(error), color: 'error' })
    }
    finally {
      running.value = null
      controller = null
      void queryCache.invalidateQueries({ key: bookKeys.entrySuggestions(toValue(bookId), doc.id) })
    }
  }

  const context: InlineAiContext = {
    run: (editor, action, target, param) => void run(editor, action, target, param),
    ask: (editor, target) => {
      asking.value = { editor, target }
      prompt.value = ''
    },
  }
  provide(INLINE_AI_CONTEXT, context)

  return {
    context,
    running,
    preview,
    /** The "Ask AI" prompt is open. */
    asking: computed({ get: () => asking.value !== null, set: (open) => {
      if (!open) asking.value = null
    } }),
    prompt,
    submitPrompt() {
      const target = asking.value
      const instruction = prompt.value.trim()
      if (!target || !instruction) return
      asking.value = null
      void run(target.editor, 'custom', target.target, instruction)
    },
    stop: () => controller?.abort(),
  }
}
