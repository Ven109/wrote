import type { LanguageModelV4CallOptions, LanguageModelV4StreamPart, LanguageModelV4Usage } from '@ai-sdk/provider'
import type { LanguageModelMiddleware } from 'ai'
import type { TokenUsage } from '#shared/schemas/usage'

/** Token counts from a provider's usage report (missing numbers count as 0). */
export function toTokenUsage(usage: LanguageModelV4Usage): TokenUsage {
  return {
    inputTokens: usage.inputTokens.total ?? 0,
    outputTokens: usage.outputTokens.total ?? 0,
    cachedTokens: usage.inputTokens.cacheRead ?? 0,
  }
}

/**
 * Reports the token usage of every call (generate and stream) to `onUsage`. Recording never breaks a
 * call: errors of `onUsage` are swallowed.
 */
export function usageMiddleware(onUsage: (usage: TokenUsage) => Promise<void> | void): LanguageModelMiddleware {
  const report = (usage: LanguageModelV4Usage) => {
    void Promise.resolve().then(() => onUsage(toTokenUsage(usage))).catch(() => undefined)
  }
  return {
    wrapGenerate: async ({ doGenerate }) => {
      const result = await doGenerate()
      report(result.usage)
      return result
    },
    wrapStream: async ({ doStream }) => {
      const { stream, ...rest } = await doStream()
      const watched = stream.pipeThrough(new TransformStream<LanguageModelV4StreamPart, LanguageModelV4StreamPart>({
        transform(part, controller) {
          if (part.type === 'finish') report(part.usage)
          controller.enqueue(part)
        },
      }))
      return { stream: watched, ...rest }
    },
  }
}

const EPHEMERAL = { anthropic: { cacheControl: { type: 'ephemeral' } } }

/**
 * Prompt caching for Anthropic: marks the end of the system prompt (instructions + book context, the
 * stable prefix of a request) as a cache breakpoint, so repeated requests – review runs over the same
 * chapter, chat turns – read it from the cache. OpenAI and Gemini cache stable prefixes automatically.
 */
export function withPromptCache(params: LanguageModelV4CallOptions): LanguageModelV4CallOptions {
  const lastSystem = params.prompt.findLastIndex(message => message.role === 'system')
  if (lastSystem < 0) return params
  const prompt = params.prompt.map((message, index) => (index === lastSystem
    ? { ...message, providerOptions: { ...message.providerOptions, anthropic: { ...message.providerOptions?.anthropic, ...EPHEMERAL.anthropic } } }
    : message))
  return { ...params, prompt }
}

export const promptCacheMiddleware: LanguageModelMiddleware = {
  transformParams: async ({ params }) => withPromptCache(params),
}

/** Whether a model reference gets the prompt-cache middleware. */
export const supportsExplicitCache = (ref: string) => ref.startsWith('anthropic:')
