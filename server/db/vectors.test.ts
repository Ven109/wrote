import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { copyFixtureBook } from '../../test/utils/fixture-book'
import { conceptVector } from '../../test/utils/fake-embeddings'
import { createBookRepository } from '../storage/repository'
import { openIndexDb, type IndexDb } from './client'
import { syncIndex } from './indexer'
import { embeddingCoverage, embeddingModel, nearestChunks, pendingChunks, pruneEmbeddings, storeEmbeddings, useEmbeddingModel } from './vectors'

let db: IndexDb
let cleanup: () => Promise<void>

beforeEach(async () => {
  const fixture = await copyFixtureBook()
  cleanup = fixture.cleanup
  db = await openIndexDb(':memory:')
  await syncIndex(db, createBookRepository(fixture.root))
})
afterEach(async () => {
  db.$client.close()
  await cleanup()
})

async function embedAll() {
  const pending = await pendingChunks(db, 1000)
  await storeEmbeddings(db, pending.map(chunk => ({ hash: chunk.hash, vector: conceptVector(chunk.text) })))
}

describe('vector store', () => {
  it('tracks coverage and stores vectors per chunk hash', async () => {
    const before = await embeddingCoverage(db)
    expect(before).toMatchObject({ model: null, embedded: 0 })
    expect(before.total).toBeGreaterThan(5)
    await embedAll()
    expect(await embeddingCoverage(db)).toMatchObject({ total: before.total, embedded: before.total })
    expect(await pendingChunks(db, 10)).toEqual([])
  })

  it('finds the nearest chunks by cosine distance, with filters', async () => {
    await embedAll()
    const hits = await nearestChunks(db, conceptVector('ashamed, avoiding everyone'), { types: ['scene'] })
    expect(hits[0]).toMatchObject({ title: 'The Meeting', type: 'scene' })
    expect(hits[0]!.distance).toBeLessThan(hits.at(-1)!.distance)
    expect(hits.every(hit => hit.type === 'scene')).toBe(true)
  })

  it('drops all vectors when the model changes and prunes vectors of removed text', async () => {
    expect(await useEmbeddingModel(db, 'ollama:a')).toBe(true)
    expect(await useEmbeddingModel(db, 'ollama:a')).toBe(false)
    await embedAll()
    await storeEmbeddings(db, [{ hash: 'stale', vector: [1, 0, 0, 0, 0, 0] }])
    expect(await pruneEmbeddings(db)).toBe(1)
    expect(await useEmbeddingModel(db, 'openai:b')).toBe(true)
    expect(await embeddingModel(db)).toBe('openai:b')
    expect((await embeddingCoverage(db)).embedded).toBe(0)
  })
})
