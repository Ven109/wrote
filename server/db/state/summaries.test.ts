import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openStateDb, type StateDb } from './client'
import { deleteSummary, getSummary, listSummaries, pruneSummaries, recordUsage, saveGeneratedSummary, saveManualSummary, usageToday } from './summaries'

let db: StateDb
const now = new Date('2026-09-27T10:00:00Z')
const generated = (text: string) => ({ entryId: 'scn_a', scope: 'scene' as const, text, sourceText: 'body', sourceHash: 'h1', model: 'ollama:m' })

beforeEach(async () => {
  db = await openStateDb(':memory:')
})
afterEach(() => db.$client.close())

describe('summaries store', () => {
  it('stores and replaces generated summaries', async () => {
    expect(await saveGeneratedSummary(db, generated('First'), now)).toBe(true)
    expect(await saveGeneratedSummary(db, generated('Second'), now)).toBe(true)
    expect(await getSummary(db, 'scn_a')).toMatchObject({ text: 'Second', isManual: false, model: 'ollama:m', sourceHash: 'h1' })
  })

  it('never overwrites a manual summary with a generated one', async () => {
    await saveGeneratedSummary(db, generated('Generated'), now)
    expect(await saveManualSummary(db, { entryId: 'scn_a', scope: 'scene', text: 'Mine' }, now)).toMatchObject({ text: 'Mine', isManual: true, model: null, sourceHash: null })
    expect(await saveGeneratedSummary(db, generated('Generated again'), now)).toBe(false)
    expect((await getSummary(db, 'scn_a'))?.text).toBe('Mine')
    expect(await deleteSummary(db, 'scn_a')).toBe(true)
    expect(await getSummary(db, 'scn_a')).toBeNull()
  })

  it('prunes summaries of deleted entries', async () => {
    await saveGeneratedSummary(db, generated('A'), now)
    await saveGeneratedSummary(db, { ...generated('B'), entryId: 'scn_b' }, now)
    expect(await pruneSummaries(db, ['scn_b'])).toBe(1)
    expect((await listSummaries(db)).map(s => s.entryId)).toEqual(['scn_b'])
    expect(await pruneSummaries(db, [])).toBe(1)
  })

  it('adds up token usage per UTC day and feature', async () => {
    await recordUsage(db, 'summaries', 120, now)
    await recordUsage(db, 'summaries', 80.4, now)
    await recordUsage(db, 'other', 5, now)
    expect(await usageToday(db, 'summaries', now)).toBe(200)
    expect(await usageToday(db, 'summaries', new Date('2026-09-28T00:00:01Z'))).toBe(0)
  })
})
