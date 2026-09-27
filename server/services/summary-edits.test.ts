import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestWorkspace } from '../../test/utils/workspace'
import { saveGeneratedSummary } from '../db/state/summaries'
import { runTool } from '../tools/define'
import { getSummariesTool } from '../tools/summary-tools'
import { updateAiSettings } from './ai-settings'
import { readSummaries, readSummary, resetSummary, writeManualSummary } from './summary-edits'
import { scheduleSummaries, SUMMARIZE_JOB, withSummaryRefresh } from './summary-jobs'
import { closeAllBooks, openBook, type BookContext } from './workspace'

let workspace: string
let book: BookContext

beforeEach(async () => {
  workspace = await createTestWorkspace()
  book = await openBook(workspace, 'sample-book')
})
afterEach(() => closeAllBooks())

const generated = (entryId: string, scope: 'scene' | 'chapter' | 'book', text: string) =>
  saveGeneratedSummary(book.state, { entryId, scope, text, sourceText: null, sourceHash: 'h', model: 'ollama:m' }, new Date())

describe('summary edits', () => {
  it('saves a manual summary with the entry\'s scope and hides internal fields', async () => {
    const summary = await writeManualSummary(book, 'chp_harb0r0001', 'The harbor chapter, in my words.')
    expect(summary).toMatchObject({ entryId: 'chp_harb0r0001', scope: 'chapter', isManual: true, model: null })
    expect(summary).not.toHaveProperty('sourceText')
    expect(await readSummary(book, 'chp_harb0r0001')).toEqual(summary)
    expect((await readSummaries(book)).map(s => s.entryId)).toEqual(['chp_harb0r0001'])
  })

  it('rejects unknown entries and entries without summaries', async () => {
    await expect(writeManualSummary(book, 'scn_missing001', 'x')).rejects.toMatchObject({ code: 'not_found' })
    await expect(writeManualSummary(book, 'nte_end1ng0001', 'x')).rejects.toMatchObject({ code: 'invalid_input' })
    expect((await writeManualSummary(book, 'book', 'The whole story.')).scope).toBe('book')
  })

  it('resets a summary to automatic', async () => {
    await writeManualSummary(book, 'scn_arr1val001', 'Mine')
    await resetSummary(book, 'scn_arr1val001')
    expect(await readSummary(book, 'scn_arr1val001')).toBeNull()
  })
})

describe('summary scheduling', () => {
  const fakeBook = (): BookContext => ({ workspaceDir: workspace, jobs: { enqueue: vi.fn(async () => ({ id: 'job_1' })) } }) as unknown as BookContext
  const enableSummaries = () => updateAiSettings(workspace, { providers: { ollama: { enabled: true } }, models: { chat: 'ollama:llama3.2' }, summaries: { enabled: true } })

  it('queues nothing while summaries are off (the default) or no model is set', async () => {
    const target = fakeBook()
    expect(await scheduleSummaries(target)).toBeNull()
    await updateAiSettings(workspace, { summaries: { enabled: true } })
    expect(await scheduleSummaries(target)).toBeNull()
    expect(target.jobs.enqueue).not.toHaveBeenCalled()
  })

  it('queues a unique, debounced job for manuscript changes only', async () => {
    await enableSummaries()
    const target = fakeBook()
    expect(await scheduleSummaries(target, { path: 'notes/ending.md' })).toBeNull()
    await scheduleSummaries(target, { path: 'manuscript/01-part-one/01-the-harbor/01-arrival.md' })
    expect(target.jobs.enqueue).toHaveBeenCalledWith(SUMMARIZE_JOB, {}, { unique: true, delayMs: 60_000 })
  })

  it('refreshes open books right away when summaries are switched on', async () => {
    const target = fakeBook()
    await updateAiSettings(workspace, { providers: { ollama: { enabled: true } }, models: { chat: 'ollama:llama3.2' } })
    await withSummaryRefresh(workspace, [target], () => updateAiSettings(workspace, { summaries: { dailyTokenBudget: 5000 } }))
    expect(target.jobs.enqueue).not.toHaveBeenCalled()
    await withSummaryRefresh(workspace, [target], () => updateAiSettings(workspace, { summaries: { enabled: true } }))
    expect(target.jobs.enqueue).toHaveBeenCalledWith(SUMMARIZE_JOB, {}, { unique: true, delayMs: 0 })
  })

  it('does not use a workspace without AI settings', async () => {
    const empty = await mkdtemp(join(tmpdir(), 'wrote-empty-'))
    expect(await scheduleSummaries({ ...fakeBook(), workspaceDir: empty } as BookContext)).toBeNull()
  })
})

describe('get_summaries tool', () => {
  it('returns the book summary and an outline of part and chapter summaries, scenes on request', async () => {
    await generated('book', 'book', 'The whole story.')
    await generated('chp_harb0r0001', 'chapter', 'Mara returns to the harbor.')
    await generated('scn_arr1val001', 'scene', 'Mara arrives.')
    const context = { workspaceDir: workspace, book, caller: { kind: 'assistant' as const, name: 'Test' } }
    const overview = await runTool(getSummariesTool, {}, context)
    expect(overview.book).toBe('The whole story.')
    const part = overview.outline[0]!
    expect(part).toMatchObject({ type: 'part', title: 'Part One', summary: null })
    expect(part.children?.[0]).toEqual({ id: 'chp_harb0r0001', type: 'chapter', title: 'The Harbor', summary: 'Mara returns to the harbor.' })
    const detailed = await runTool(getSummariesTool, { includeScenes: true }, context)
    expect(detailed.outline[0]!.children?.[0]?.children?.[0]).toMatchObject({ title: 'Arrival', summary: 'Mara arrives.' })
  })
})
