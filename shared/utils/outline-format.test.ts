import { describe, expect, it } from 'vitest'
import { ensureOutlineIds, parseOutline, serializeOutline } from './outline-format'

const CANONICAL = `Notes about the book.

## Act One: Return

<!-- wrote:act id=act_one -->

### Mara returns

<!-- wrote:beat id=bt_arrive scenes=scn_a,scn_b -->

She arrives at low tide.

Second paragraph.

### The map

<!-- wrote:beat id=bt_map -->

## Act Two

<!-- wrote:act id=act_two -->
`

describe('outline format', () => {
  it('parses notes, acts and beats with their scenes and summaries', () => {
    expect(parseOutline(CANONICAL)).toEqual({
      notes: 'Notes about the book.',
      acts: [
        { id: 'act_one', title: 'Act One: Return', beats: [
          { id: 'bt_arrive', title: 'Mara returns', summary: 'She arrives at low tide.\n\nSecond paragraph.', scenes: ['scn_a', 'scn_b'] },
          { id: 'bt_map', title: 'The map', summary: '', scenes: [] },
        ] },
        { id: 'act_two', title: 'Act Two', beats: [] },
      ],
    })
  })

  it('round-trips the canonical format without a diff', () => {
    expect(serializeOutline(parseOutline(CANONICAL))).toBe(CANONICAL)
  })

  it('keeps an outline without acts as notes, and gives hand-written headings ids', () => {
    expect(parseOutline('1. Mara returns.\n2. The map.\n')).toEqual({ notes: '1. Mara returns.\n2. The map.', acts: [] })
    const outline = parseOutline('## Setup\n\n### Inciting incident\nA storm.\n')
    let n = 0
    expect(ensureOutlineIds(outline, prefix => `${prefix}_${++n}`)).toBe(true)
    expect(serializeOutline(outline)).toBe('## Setup\n\n<!-- wrote:act id=act_1 -->\n\n### Inciting incident\n\n<!-- wrote:beat id=bt_2 -->\n\nA storm.\n')
    expect(ensureOutlineIds(outline, () => 'x')).toBe(false)
  })

  it('treats an empty outline as empty', () => {
    expect(serializeOutline(parseOutline(''))).toBe('')
  })
})
