import { readUIMessageStream, type UIMessage, type UIMessageChunk } from 'ai'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestWorkspace } from '../../test/utils/workspace'
import { scriptedModel } from '../../test/utils/mock-model'
import { createThread, threadMessages } from '../db/state/chat'
import { getContextSnapshot } from '../db/state/context-snapshots'
import { assistantTools, latestQuestion, prepareAssistantPrompt, streamAssistant, titleFromMessages } from './assistant'
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
  it('offers the tools its policy does not deny', () => {
    const names = Object.keys(assistantTools(book, workspaceDir))
    expect(names).toEqual(expect.arrayContaining(['search', 'read_entry', 'propose_edit', 'create_note']))
    const readOnly = Object.keys(assistantTools(book, workspaceDir, { read: 'allow', propose: 'allow', write: 'deny', destructive: 'deny' }))
    expect(readOnly).not.toContain('create_note')
  })

  it('builds the system prompt from the context engine and stores exactly that prompt', async () => {
    const snapshot = await prepareAssistantPrompt({
      book,
      modelRef: 'ollama:tiny',
      messages: [userMessage('What does Mara Velden remember?')],
      context: { entryPath: 'manuscript/01-part-one/01-the-harbor/01-arrival.md', selection: 'salt and tar' },
    }, new Date())
    expect(snapshot.system).toContain(`"${(await book.repository.readConfig()).title}"`)
    expect(snapshot.system).toContain('scene "Arrival"')
    expect(snapshot.system).toMatch(/untrusted/)
    expect(snapshot.items.map(item => item.id)).toEqual(expect.arrayContaining(['selection', 'entry:scn_arr1val001', 'codex:cdx_mara000001']))
    for (const item of snapshot.items) expect(snapshot.system).toContain(item.text.slice(0, 40))
    expect(await getContextSnapshot(book.state, snapshot.id)).toEqual(snapshot)
  })

  it('finds the latest question', () => {
    expect(latestQuestion([userMessage('first'), { id: 'a', role: 'assistant', parts: [] }, userMessage('second')])).toBe('second')
    expect(latestQuestion([])).toBe('')
  })

  it('answers with the search tool and persists the thread', async () => {
    const thread = await createThread(book.state, 'New chat', new Date())
    const model = scriptedModel([
      { toolCall: { name: 'search', input: { query: 'harbor' } } },
      { text: 'The harbor appears in "Arrival".' },
    ])
    const response = await streamAssistant({ book, workspaceDir, model, modelRef: 'ollama:tiny', threadId: thread.id, messages: [userMessage('Which scenes mention the harbor?')], context: {} })
    const message = await readFinalMessage(response)

    // The model got the snapshot's system prompt, and the answer points to that snapshot.
    const snapshotId = (message.metadata as { contextSnapshotId: string }).contextSnapshotId
    const snapshot = await getContextSnapshot(book.state, snapshotId)
    expect(JSON.stringify(model.prompts[0])).toContain(JSON.stringify(snapshot!.system).slice(1, -1))

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
