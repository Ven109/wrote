import type { LanguageModelV4, LanguageModelV4StreamPart } from '@ai-sdk/provider'
import { MockLanguageModelV4, simulateReadableStream } from 'ai/test'

const usage = { inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 1, text: 1, reasoning: 0 } }

export type MockStep = { text: string } | { toolCall: { name: string, input: Record<string, unknown> } }

function partsFor(step: MockStep, index: number): LanguageModelV4StreamPart[] {
  if ('text' in step) {
    return [
      { type: 'stream-start', warnings: [] },
      { type: 'text-start', id: `t${index}` },
      { type: 'text-delta', id: `t${index}`, delta: step.text },
      { type: 'text-end', id: `t${index}` },
      { type: 'finish', finishReason: { unified: 'stop', raw: 'stop' }, usage },
    ] as LanguageModelV4StreamPart[]
  }
  return [
    { type: 'stream-start', warnings: [] },
    { type: 'tool-call', toolCallId: `call${index}`, toolName: step.toolCall.name, input: JSON.stringify(step.toolCall.input) },
    { type: 'finish', finishReason: { unified: 'tool-calls', raw: 'tool_calls' }, usage },
  ] as LanguageModelV4StreamPart[]
}

/** A scripted streaming model: each call plays the next step (tool call or text). Records the prompts. */
export function scriptedModel(steps: MockStep[]): MockLanguageModelV4 & { prompts: unknown[] } {
  let call = 0
  const prompts: unknown[] = []
  const model = new MockLanguageModelV4({
    doStream: async (options) => {
      prompts.push(options.prompt)
      const step = steps[Math.min(call, steps.length - 1)]!
      const parts = partsFor(step, call++)
      return { stream: simulateReadableStream({ chunks: parts }) }
    },
  }) as MockLanguageModelV4 & { prompts: unknown[] }
  model.prompts = prompts
  return model
}

export type { LanguageModelV4 }

/** A non-streaming model that answers every call with `text` (e.g. JSON for structured output). Records the prompts. */
export function textModel(text: string): MockLanguageModelV4 & { prompts: unknown[] } {
  const prompts: unknown[] = []
  const model = new MockLanguageModelV4({
    doGenerate: async (options) => {
      prompts.push(options.prompt)
      return { content: [{ type: 'text', text }], finishReason: { unified: 'stop', raw: 'stop' }, usage, warnings: [] }
    },
  }) as MockLanguageModelV4 & { prompts: unknown[] }
  model.prompts = prompts
  return model
}
