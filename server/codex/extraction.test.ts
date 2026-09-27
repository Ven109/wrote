import { describe, expect, it } from 'vitest'
import { BUILT_IN_CODEX_TYPES } from '#shared/schemas/codex'
import { normalizeExtraction, verifiedEvidence, type ExistingCodexEntry, type ExtractionOutput } from './extraction'

const TEXT = 'Mara Velden climbed to the Lantern. Old Tobin, the harbour master, waited there with his grey dog. "You are late," Tobin said.'
const MARA: ExistingCodexEntry = { id: 'cdx_mara', path: 'codex/characters/mara-velden.md', title: 'Mara Velden', codexType: 'character', aliases: ['The Cartographer'], frontmatter: { role: 'protagonist' } }
const found = (entry: Partial<ExtractionOutput['entries'][number]>): ExtractionOutput['entries'][number] =>
  ({ name: 'X', type: 'character', existingId: null, aliases: [], facts: [], description: '', evidence: [], ...entry })
const run = (entries: ExtractionOutput['entries'], existing: ExistingCodexEntry[] = [MARA]) => normalizeExtraction({ entries }, TEXT, existing, BUILT_IN_CODEX_TYPES)

describe('verifiedEvidence', () => {
  it('keeps quotes that occur in the text, ignoring case, quotes and whitespace', () => {
    expect(verifiedEvidence(['"old tobin, the  harbour master"', 'He flew away', 'Tobin said'], TEXT)).toEqual(['old tobin, the  harbour master', 'Tobin said'])
  })
})

describe('normalizeExtraction', () => {
  it('proposes new entries with template fields, and drops ones without real evidence', () => {
    const drafts = run([
      found({ name: 'Tobin', aliases: ['Old Tobin'], facts: [{ field: 'Role', value: 'Supporting' }, { field: 'mood', value: 'grumpy' }], description: 'The harbour master.', evidence: ['Old Tobin, the harbour master'] }),
      found({ name: 'The Lantern', type: 'place', facts: [{ field: 'features', value: 'stairs; lamp' }], evidence: ['climbed to the Lantern'] }),
      found({ name: 'Ghost', evidence: ['a ghost appeared'] }),
    ])
    expect(drafts).toEqual([
      { action: 'create', codexType: 'character', title: 'Tobin', targetEntryId: null, targetPath: null, aliases: ['Old Tobin'], fields: { role: 'supporting' }, description: 'The harbour master.', evidence: ['Old Tobin, the harbour master'] },
      expect.objectContaining({ title: 'The Lantern', codexType: 'place', fields: { features: ['stairs', 'lamp'] } }),
    ])
  })

  it('turns known names into updates with only the new facts, and skips updates that add nothing', () => {
    const drafts = run([
      found({ name: 'Mara', existingId: null, aliases: ['Mara Velden'], facts: [{ field: 'role', value: 'protagonist' }, { field: 'age', value: '34' }], evidence: ['Mara Velden climbed'] }),
      found({ name: 'The Cartographer', facts: [{ field: 'role', value: 'protagonist' }], evidence: ['Mara Velden climbed'] }),
    ])
    expect(drafts).toEqual([{ action: 'update', codexType: 'character', title: 'Mara Velden', targetEntryId: 'cdx_mara', targetPath: MARA.path, aliases: ['Mara'], fields: { age: '34' }, description: '', evidence: ['Mara Velden climbed'] }])
  })

  it('resolves entry fields to codex ids and falls back to lore for unknown types', () => {
    const [tobin, lamp] = run([
      found({ name: 'Tobin', facts: [{ field: 'relationships', value: 'Mara Velden, Nobody' }], evidence: ['Tobin said'] }),
      found({ name: 'Grey dog', type: 'animal', evidence: ['his grey dog'] }),
    ])
    expect(tobin!.fields).toEqual({ relationships: ['cdx_mara'] })
    expect(lamp!.codexType).toBe('lore')
  })
})
