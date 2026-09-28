import { generateText, streamText, wrapLanguageModel } from 'ai'
import { describe, expect, it, vi } from 'vitest'
import { scriptedModel, textModel } from '../../test/utils/mock-model'
import { promptCacheMiddleware, supportsExplicitCache, usageMiddleware } from './usage-middleware'

describe('usageMiddleware', () => {
  it('reports the tokens of generated and streamed calls', async () => {
    const onUsage = vi.fn()
    await generateText({ model: wrapLanguageModel({ model: textModel('hi'), middleware: usageMiddleware(onUsage) }), prompt: 'x' })
    const stream = streamText({ model: wrapLanguageModel({ model: scriptedModel([{ text: 'yo' }]), middleware: usageMiddleware(onUsage) }), prompt: 'x' })
    await stream.consumeStream()
    await vi.waitFor(() => expect(onUsage).toHaveBeenCalledTimes(2))
    expect(onUsage).toHaveBeenCalledWith({ inputTokens: 1, outputTokens: 1, cachedTokens: 0 })
  })

  it('never fails a call when recording fails', async () => {
    const model = wrapLanguageModel({ model: textModel('ok'), middleware: usageMiddleware(() => Promise.reject(new Error('disk full'))) })
    expect((await generateText({ model, prompt: 'x' })).text).toBe('ok')
  })
})

describe('promptCacheMiddleware', () => {
  it('marks the system prompt as an Anthropic cache breakpoint', async () => {
    const model = textModel('ok')
    await generateText({ model: wrapLanguageModel({ model, middleware: promptCacheMiddleware }), system: 'Book context …', prompt: 'Review this.' })
    const [system, user] = model.prompts[0] as { role: string, providerOptions?: unknown }[]
    expect(system).toMatchObject({ role: 'system', providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } } })
    expect(user!.providerOptions).toBeUndefined()
    expect([supportsExplicitCache('anthropic:claude-sonnet-5'), supportsExplicitCache('openai:gpt-5')]).toEqual([true, false])
  })
})
