import { readFile, readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const SERVER = join(import.meta.dirname, '..', '..')
const MODEL_CALL = /\b(streamText|generateText|streamObject|generateObject)\s*\(/

/**
 * Files allowed to call a model directly, and why. Everything that answers the author with book content
 * must build its prompt with the context engine (`buildContext` → snapshot), so the context drawer shows
 * exactly what was sent.
 */
const ALLOWED: Record<string, { reason: string, mustUse?: RegExp }> = {
  'services/assistant.ts': { reason: 'assistant – prompt from the context engine', mustUse: /prepareAssistantPrompt|buildContext/ },
  'services/inline-ai.ts': { reason: 'inline actions and autocomplete – prompts from the context engine', mustUse: /buildContext/ },
  'services/codex-extraction.ts': { reason: 'codex extraction – the scanned manuscript text is the input by design; prompt in ai/extraction-prompts.ts', mustUse: /extractionPrompt/ },
  'services/outline-helpers.ts': { reason: 'outline helpers – book context from the context engine, plus the outline itself', mustUse: /buildContext/ },
  'services/review-runs.ts': { reason: 'review agents – book context from the context engine, the reviewed scene in full', mustUse: /buildContext/ },
  'services/summary-jobs.ts': { reason: 'background summaries – no request from the author; prompts in ai/summary-prompts.ts' },
}

async function sourceFiles(dir: string): Promise<string[]> {
  const found: string[] = []
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, item.name)
    if (item.isDirectory()) found.push(...await sourceFiles(path))
    else if (item.name.endsWith('.ts') && !item.name.endsWith('.test.ts')) found.push(path)
  }
  return found
}

describe('context engine coverage', () => {
  it('no AI feature calls a model without going through the context engine', async () => {
    const callers: string[] = []
    for (const file of await sourceFiles(SERVER)) {
      const source = await readFile(file, 'utf8')
      if (!MODEL_CALL.test(source)) continue
      const name = relative(SERVER, file)
      callers.push(name)
      expect(ALLOWED[name], `${name} calls a model directly – build its prompt with buildContext (server/ai/context) or add a justified exception`).toBeDefined()
      if (ALLOWED[name]?.mustUse) expect(source).toMatch(ALLOWED[name].mustUse)
    }
    expect(callers.sort()).toEqual(Object.keys(ALLOWED).sort())
  })
})
