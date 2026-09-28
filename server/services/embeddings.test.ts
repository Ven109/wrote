import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { copyFixtureBook } from '../../test/utils/fixture-book'
import { fakeEmbed } from '../../test/utils/fake-embeddings'
import { openIndexDb, type IndexDb } from '../db/client'
import { applyChange, syncIndex } from '../db/indexer'
import { embeddingCoverage } from '../db/vectors'
import { createBookRepository, type BookRepository } from '../storage/repository'
import { updateAiSettings } from './ai-settings'
import { EMBED_JOB, embedIndex, scheduleEmbedding, withEmbeddingRefresh, type EmbedTexts } from './embeddings'
import type { BookContext } from './workspace'
import { createTempDir } from '../../test/utils/workspace'

let db: IndexDb
let repo: BookRepository
let root: string
let cleanup: () => Promise<void>
const signal = new AbortController().signal

beforeEach(async () => {
  ({ root, cleanup } = await copyFixtureBook())
  repo = createBookRepository(root)
  db = await openIndexDb(':memory:')
  await syncIndex(db, repo)
})
afterEach(async () => {
  db.$client.close()
  await cleanup()
})

const counting = () => {
  const seen: string[] = []
  const embed: EmbedTexts = async (values) => {
    seen.push(...values)
    return fakeEmbed(values)
  }
  return { embed, seen }
}

describe('embedIndex', () => {
  it('embeds every chunk once, reporting progress, then nothing on the next run', async () => {
    const { embed, seen } = counting()
    const progress = vi.fn(async () => {})
    const first = await embedIndex(db, { embed, model: 'ollama:m', signal, progress })
    const { total } = await embeddingCoverage(db)
    expect(first).toEqual({ embedded: total, pruned: 0, total, reset: true })
    expect(seen).toHaveLength(total)
    expect(progress).toHaveBeenLastCalledWith(1, `${total} of ${total} passages`)
    expect(await embedIndex(db, { embed, model: 'ollama:m', signal })).toMatchObject({ embedded: 0, reset: false })
  })

  it('re-embeds only the changed passage after an edit and prunes the old vector', async () => {
    await embedIndex(db, { embed: counting().embed, model: 'ollama:m', signal })
    await writeFile(join(root, 'manuscript/01-part-one/02-the-drowned-guild/01-the-meeting.md'),
      '---\nid: scn_meet1ng001\ntitle: The Meeting\n---\nNobody at the Lantern would meet her gaze.\n')
    await applyChange(db, repo, { kind: 'changed', path: 'manuscript/01-part-one/02-the-drowned-guild/01-the-meeting.md' })
    const { embed, seen } = counting()
    expect(await embedIndex(db, { embed, model: 'ollama:m', signal })).toMatchObject({ embedded: 1, pruned: 1 })
    expect(seen).toEqual(['The Meeting\n\nNobody at the Lantern would meet her gaze.'])
  })

  it('recomputes everything when the model changes', async () => {
    await embedIndex(db, { embed: counting().embed, model: 'ollama:a', signal })
    const { embed, seen } = counting()
    const result = await embedIndex(db, { embed, model: 'openai:b', signal })
    expect(result.reset).toBe(true)
    expect(seen).toHaveLength(result.total)
  })

  it('stops when aborted and rejects a model that returns the wrong number of vectors', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(embedIndex(db, { embed: counting().embed, model: 'ollama:m', signal: controller.signal })).rejects.toThrow()
    await expect(embedIndex(db, { embed: async () => [[1]], model: 'ollama:m', signal })).rejects.toThrow(/returned 1 vectors/)
  })
})

describe('scheduling', () => {
  let workspace: string
  const fakeBook = (): BookContext => ({ workspaceDir: workspace, db, jobs: { enqueue: vi.fn(async () => ({ id: 'job_1' })) } }) as unknown as BookContext

  beforeEach(async () => {
    workspace = await createTempDir('wrote-emb-')
  })

  it('queues nothing without an embedding model', async () => {
    const book = fakeBook()
    expect(await scheduleEmbedding(book)).toBeNull()
    expect(book.jobs.enqueue).not.toHaveBeenCalled()
  })

  it('queues a unique, debounced job once a model is configured', async () => {
    await updateAiSettings(workspace, { providers: { ollama: { enabled: true } }, models: { embedding: 'ollama:nomic-embed-text' } })
    const book = fakeBook()
    await scheduleEmbedding(book)
    expect(book.jobs.enqueue).toHaveBeenCalledWith(EMBED_JOB, {}, { unique: true, delayMs: 4000 })
  })

  it('queues nothing when every passage already has a vector from the model', async () => {
    await updateAiSettings(workspace, { providers: { ollama: { enabled: true } }, models: { embedding: 'ollama:nomic-embed-text' } })
    await embedIndex(db, { embed: counting().embed, model: 'ollama:nomic-embed-text', signal })
    const book = fakeBook()
    expect(await scheduleEmbedding(book)).toBeNull()
    await embedIndex(db, { embed: counting().embed, model: 'ollama:other', signal })
    expect(await scheduleEmbedding(book)).not.toBeNull()
  })

  it('does not treat providers without an embedding API as configured', async () => {
    await updateAiSettings(workspace, { providers: { anthropic: { enabled: true } }, keys: { anthropic: 'k' }, models: { embedding: 'anthropic:claude-sonnet-5' } })
    expect(await scheduleEmbedding(fakeBook())).toBeNull()
  })

  it('re-embeds open books right away when a settings change switches the model', async () => {
    const book = fakeBook()
    await withEmbeddingRefresh(workspace, [book], () => updateAiSettings(workspace, { providers: { ollama: { enabled: true } } }))
    expect(book.jobs.enqueue).not.toHaveBeenCalled()
    await withEmbeddingRefresh(workspace, [book], () => updateAiSettings(workspace, { models: { embedding: 'ollama:nomic-embed-text' } }))
    expect(book.jobs.enqueue).toHaveBeenCalledWith(EMBED_JOB, {}, { unique: true, delayMs: 0 })
    vi.mocked(book.jobs.enqueue).mockClear()
    await withEmbeddingRefresh(workspace, [book], () => updateAiSettings(workspace, { models: { chat: 'ollama:llama3.2' } }))
    expect(book.jobs.enqueue).not.toHaveBeenCalled()
  })
})
