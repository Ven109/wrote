import { readUIMessageStream, type UIMessage, type UIMessageChunk } from 'ai'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestWorkspace } from '../../test/utils/workspace'
import { scriptedModel } from '../../test/utils/mock-model'
import { createThread, threadMessages } from '../db/state/chat'
import { assistantTools, streamAssistant, systemPrompt, titleFromMessages } from './assistant'
import { closeAllBooks, openBook, type BookContext } from './workspace'

let book: BookContext
let workspaceDir: string

beforeAll(async () => {
  workspaceDir = await createTestWorkspace()
  book = await openBook(workspaceDir, 'sample-book')
})
afterAll(() => closeAllBooks())

const userMessage = (text: string): UIMessage => ({ id: 'u1', role: 'user', parts: [{ type: 'text', text }] })

async function readFinalMessage(response: Response): Promise<UIMessage> {
  const chunks = response.body!.pipeThrough(new TextDecoderStream()).pipeThrough(new TransformStream<string, UIMessageChunk>({
    transform(text, controller) {
      for (const line of text.split('\n')) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') controller.enqueue(JSON.parse(line.slice(6)))
      }
    },
  }))
  let last: UIMessage | undefined
  for await (const message of readUIMessageStream({ stream: chunks })) last = message
  return last!
}

describe('assistant', () => {
  it('offers only read and propose tools', () => {
    const names = Object.keys(assistantTools(book, workspaceDir))
    expect(names).toEqual(expect.arrayContaining(['search', 'read_entry', 'propose_edit']))
    expect(names).not.toContain('create_note')
  })

  it('puts the book and the open entry into the system prompt', async () => {
    const prompt = await systemPrompt(book, { entryPath: 'manuscript/01-part-one/01-the-harbor/01-arrival.md', selection: 'salt and tar' })
    expect(prompt).toContain(`"${(await book.repository.readConfig()).title}"`)
    expect(prompt).toContain('scene "Arrival"')
    expect(prompt).toContain('<selection>\nsalt and tar\n</selection>')
    expect(prompt).toMatch(/untrusted/)
  })

  it('answers with the search tool and persists the thread', async () => {
    const thread = await createThread(book.state, 'New chat', new Date())
    const model = scriptedModel([
      { toolCall: { name: 'search', input: { query: 'harbor' } } },
      { text: 'The harbor appears in "Arrival".' },
    ])
    const response = await streamAssistant({ book, workspaceDir, model, threadId: thread.id, messages: [userMessage('Which scenes mention the harbor?')], context: {} })
    const message = await readFinalMessage(response)

    const tool = message.parts.find(part => part.type === 'tool-search') as { state: string, output: unknown } | undefined
    expect(tool?.state).toBe('output-available')
    expect(JSON.stringify(tool?.output)).toContain('Arrival')
    expect(message.parts.at(-1)).toMatchObject({ type: 'text', text: 'The harbor appears in "Arrival".' })
    expect(model.prompts).toHaveLength(2)

    await expect.poll(async () => (await threadMessages(book.state, thread.id)).length).toBe(2)
  })

  it('titles threads from the first user message', () => {
    expect(titleFromMessages([userMessage('  Which   scenes mention the harbor?')])).toBe('Which scenes mention the harbor?')
    expect(titleFromMessages([userMessage('x'.repeat(100))])?.length).toBe(60)
    expect(titleFromMessages([])).toBeUndefined()
  })
})
