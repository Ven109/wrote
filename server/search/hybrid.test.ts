import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { copyFixtureBook } from '../../test/utils/fixture-book'
import { conceptVector } from '../../test/utils/fake-embeddings'
import { openIndexDb, type IndexDb } from '../db/client'
import { syncIndex } from '../db/indexer'
import { pendingChunks, storeEmbeddings } from '../db/vectors'
import { createBookRepository } from '../storage/repository'
import { chunkSnippet, hybridSearch, reciprocalRankFusion, RRF_K } from './hybrid'

describe('reciprocalRankFusion', () => {
  it('rewards items ranked well in several lists', () => {
    const fused = reciprocalRankFusion([['a', 'b', 'c'], ['c', 'a']])
    expect([...fused.keys()]).toEqual(['a', 'c', 'b'])
    expect(fused.get('a')).toBeCloseTo(1 / (RRF_K + 1) + 1 / (RRF_K + 2))
    expect(fused.get('b')).toBeCloseTo(1 / (RRF_K + 2))
  })

  it('handles empty lists', () => {
    expect(reciprocalRankFusion([[], []]).size).toBe(0)
  })
})

describe('chunkSnippet', () => {
  it('drops the title line, flattens whitespace and truncates', () => {
    expect(chunkSnippet('Arrival\n\nThe tide\nwas out.')).toBe('The tide was out.')
    expect(chunkSnippet(`T\n\n${'word '.repeat(100)}`)).toMatch(/^word( word)+…$/)
  })
})

describe('hybridSearch', () => {
  let db: IndexDb
  let cleanup: () => Promise<void>

  beforeEach(async () => {
    const fixture = await copyFixtureBook()
    cleanup = fixture.cleanup
    db = await openIndexDb(':memory:')
    await syncIndex(db, createBookRepository(fixture.root))
    const pending = await pendingChunks(db, 1000)
    await storeEmbeddings(db, pending.map(chunk => ({ hash: chunk.hash, vector: conceptVector(chunk.text) })))
  })
  afterEach(async () => {
    db.$client.close()
    await cleanup()
  })

  it('is plain full-text search without a query vector', async () => {
    const hits = await hybridSearch(db, 'harbor', null)
    expect(hits[0]).toMatchObject({ title: 'The Harbor', match: 'text' })
    expect(hits.every(hit => hit.match === 'text')).toBe(true)
  })

  it('finds "scenes where Mara feels guilty" by meaning although no word matches', async () => {
    const query = 'scenes where Mara feels guilty'
    expect(await hybridSearch(db, query, null)).toEqual([])
    const hits = await hybridSearch(db, query, conceptVector(query), { types: ['scene'] })
    expect(hits[0]).toMatchObject({ title: 'The Meeting', match: 'meaning', snippet: 'Nobody at the Lantern would look her in the eye.' })
  })

  it('ranks entries found both ways first and marks them', async () => {
    const hits = await hybridSearch(db, 'tide', conceptVector('tide'))
    const arrival = hits.find(hit => hit.title === 'Arrival')
    expect(arrival?.match).toBe('both')
    expect(arrival?.snippet).toContain('<mark>')
    expect(hits.indexOf(arrival!)).toBeLessThan(hits.findIndex(hit => hit.match === 'meaning'))
  })

  it('respects filters and the limit', async () => {
    const hits = await hybridSearch(db, 'sea', conceptVector('sea'), { types: ['codex'], limit: 1 })
    expect(hits).toHaveLength(1)
    expect(hits[0]!.type).toBe('codex')
  })
})
