import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getModelWithRef } from '../ai/models'
import { extractWith, scanForCodex } from '../services/codex-extraction'
import { closeAllBooks, openBook, type BookContext } from '../services/workspace'
import { createTestWorkspace } from '../../test/utils/workspace'
import { textModel } from '../../test/utils/mock-model'
import { scoreExtraction, type ExpectedEntries } from './extraction-eval'

/**
 * Extraction eval on a fixture chapter. In CI it runs against a recorded model answer (mock); with
 * `WROTE_EVAL_WORKSPACE=<dir>` (`pnpm eval:extraction`) it uses that workspace's configured chat model,
 * e.g. a local Ollama model, and reports the real recall.
 */
const FIXTURE = join(import.meta.dirname, '../../test/fixtures/extraction')
const REAL_WORKSPACE = process.env.WROTE_EVAL_WORKSPACE
let book: BookContext

beforeAll(async () => {
  book = await openBook(await createTestWorkspace(), 'sample-book')
})
afterAll(() => closeAllBooks())

async function scanFixture() {
  const chapter = await book.repository.create({ type: 'chapter', dir: 'manuscript/01-part-one', title: 'The Lighthouse' })
  await book.repository.create({ type: 'scene', dir: chapter.path.replace(/\/index\.md$/, ''), title: 'Two Hundred Steps', body: await readFile(join(FIXTURE, 'chapter.md'), 'utf8') })
  await book.settle()
  const configured = REAL_WORKSPACE ? await getModelWithRef(REAL_WORKSPACE, 'chat') : { model: textModel(await readFile(join(FIXTURE, 'mock-output.json'), 'utf8')), ref: 'mock' }
  if (!configured) throw new Error(`No chat model configured in ${REAL_WORKSPACE}`)
  const proposals = await scanForCodex(book, chapter.frontmatter.id, { extract: extractWith(configured.model), model: configured.ref, author: { kind: 'assistant', name: 'Eval' } })
  return { proposals, ref: configured.ref }
}

describe('codex extraction eval', () => {
  it('finds the main characters and places of the fixture chapter', { timeout: REAL_WORKSPACE ? 300_000 : 20_000 }, async () => {
    const expected = JSON.parse(await readFile(join(FIXTURE, 'expected.json'), 'utf8')) as ExpectedEntries
    const { proposals, ref } = await scanFixture()
    const score = scoreExtraction(expected, proposals)
    // The report is for runs against a real model; the mock run is covered by the assertions below.
    if (REAL_WORKSPACE) console.info(`[eval] extraction recall ${(score.recall * 100).toFixed(0)}% with ${ref}`, JSON.stringify(score.byType), score.extra.length ? `extra: ${score.extra.join(', ')}` : '')
    expect(score.byType.character!.recall).toBeGreaterThanOrEqual(REAL_WORKSPACE ? 0.66 : 1)
    expect(score.byType.place!.recall).toBeGreaterThanOrEqual(REAL_WORKSPACE ? 0.5 : 1)
    if (!REAL_WORKSPACE) {
      // The recorded answer misses the ship and invents a serpent; the invention has no real quote and is dropped.
      expect(score.recall).toBeCloseTo(6 / 7)
      expect(score.extra).toEqual([])
    }
  })
})

describe('scoreExtraction', () => {
  const draft = (title: string, aliases: string[] = []) => ({ action: 'create' as const, codexType: 'character', title, targetEntryId: null, targetPath: null, aliases, fields: {}, description: '', evidence: [] })
  it('matches titles, aliases, articles and partial names', () => {
    const score = scoreExtraction({ character: ['Brother Aldo', 'Ines Calder'], place: ['The Weir Market'] }, [draft('Aldo'), draft('Weir Market'), draft('Someone', ['Ines Calder']), draft('Extra')])
    expect(score.recall).toBe(1)
    expect(score.extra).toEqual(['Extra'])
  })
})
