import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { HelperPrompt } from '../ai/outline-prompts'
import { createTestWorkspace } from '../../test/utils/workspace'
import { listOutlineProposals } from './outline-proposals'
import { OUTLINE_HELPER, reviewOutline, suggestBridgeBeats, type GenerateObject } from './outline-helpers'
import { closeAllBooks, openBook, type BookContext } from './workspace'

let book: BookContext
beforeEach(async () => {
  book = await openBook(await createTestWorkspace(), 'sample-book')
})
afterEach(() => closeAllBooks())

/** A fake model: records the prompt and returns the scripted (schema-checked) output. */
function fake(output: unknown) {
  const prompts: HelperPrompt[] = []
  const generate: GenerateObject = async (prompt, schema) => {
    prompts.push(prompt)
    return schema.parse(output)
  }
  return { prompts, options: { generate, author: OUTLINE_HELPER, model: 'test:model' } }
}

describe('suggestBridgeBeats', () => {
  it('proposes alternative beats after the first beat, with the outline in the prompt', async () => {
    const model = fake({ beats: [
      { title: 'A night at the lighthouse', summary: 'She cannot sleep.', rationale: 'Quiet before the map.' },
      { title: 'The old keeper talks', summary: 'Hints about her father.', rationale: 'Motivates the search.' },
    ] })
    const created = await suggestBridgeBeats(book, { fromBeatId: 'bt_arr1va0001', toBeatId: 'bt_themap0001' }, model.options)
    expect(created).toHaveLength(2)
    expect(created[0]).toMatchObject({
      source: 'Bridge: Mara returns to Hollow Bay → She finds her father\'s map',
      author: OUTLINE_HELPER,
      model: 'test:model',
      rationale: 'Quiet before the map.',
      change: { kind: 'addBeat', actId: 'act_0ne0000001', afterBeatId: 'bt_arr1va0001', title: 'A night at the lighthouse' },
    })
    expect(model.prompts[0]!.prompt).toContain('[bt_arr1va0001] Mara returns to Hollow Bay')
    expect(model.prompts[0]!.prompt).toContain('Suggest 3 different beats')
    expect(model.prompts[0]!.system).toContain('untrusted')
    const [snapshot] = (await book.state.$client.execute(`SELECT feature, model, system FROM ai_context_snapshots`)).rows
    expect({ ...snapshot }).toMatchObject({ feature: 'outline:bridge', model: 'test:model', system: model.prompts[0]!.system })
  })

  it('refuses the same beat twice and unknown beats', async () => {
    const model = fake({ beats: [] })
    await expect(suggestBridgeBeats(book, { fromBeatId: 'bt_arr1va0001', toBeatId: 'bt_arr1va0001' }, model.options)).rejects.toThrow(/two different/)
    await expect(suggestBridgeBeats(book, { fromBeatId: 'bt_arr1va0001', toBeatId: 'bt_nope000001' }, model.options)).rejects.toThrow(/bt_nope000001/)
  })
})

describe('reviewOutline', () => {
  it('finds plot holes as notes and anchored beats, dropping beats for unknown acts', async () => {
    const model = fake({
      notes: [{ text: 'Why does the Guild wait until act two?' }, { text: ' ' }],
      beats: [
        { actId: 'act_tw00000001', afterBeatId: 'bt_0ffer00001', title: 'Mara refuses', summary: 'She walks out.', rationale: 'Shows her pride.' },
        { actId: 'act_tw00000001', afterBeatId: 'bt_invented01', title: 'Storm', summary: '', rationale: '' },
        { actId: 'act_unknown001', afterBeatId: null, title: 'Lost', summary: '', rationale: '' },
      ],
    })
    const created = await reviewOutline(book, {}, model.options)
    expect(created.map(proposal => proposal.change)).toEqual([
      { kind: 'note', text: 'Why does the Guild wait until act two?' },
      { kind: 'addBeat', actId: 'act_tw00000001', afterBeatId: 'bt_0ffer00001', title: 'Mara refuses', summary: 'She walks out.' },
      { kind: 'addBeat', actId: 'act_tw00000001', afterBeatId: 'bt_0ffer00001', title: 'Storm', summary: '' },
    ])
    expect(created[0]!.source).toBe('Plot holes')
    expect(model.prompts[0]!.prompt).toContain('Find plot holes')
  })

  it('looks at one act against a beat sheet and keeps only beats for that act', async () => {
    const model = fake({ notes: [], beats: [
      { actId: 'act_0ne0000001', afterBeatId: null, title: 'Opening image', summary: 'The bay at dawn.', rationale: 'Save the Cat opens on an image.' },
      { actId: 'act_tw00000001', afterBeatId: null, title: 'Elsewhere', summary: '', rationale: '' },
    ] })
    const created = await reviewOutline(book, { actId: 'act_0ne0000001', templateId: 'save-the-cat' }, model.options)
    expect(created).toHaveLength(1)
    expect(created[0]).toMatchObject({ source: 'Missing in Act One: Return (vs. Save the Cat)', change: { title: 'Opening image', afterBeatId: null } })
    expect(model.prompts[0]!.prompt).toContain('beat sheet "Save the Cat"')
    expect(model.prompts[0]!.prompt).toContain('What is missing in the act "Act One: Return"')
    expect(await listOutlineProposals(book, { status: 'pending' })).toHaveLength(1)
  })

  it('reports unknown acts and templates', async () => {
    const model = fake({ notes: [], beats: [] })
    await expect(reviewOutline(book, { actId: 'act_nope000001' }, model.options)).rejects.toThrow(/act_nope000001/)
    await expect(reviewOutline(book, { templateId: 'nope' }, model.options)).rejects.toThrow(/nope/)
  })
})
