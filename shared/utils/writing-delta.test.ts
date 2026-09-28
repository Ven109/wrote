import { describe, expect, it } from 'vitest'
import { writingDelta } from './writing-delta'

const counts = (delta: ReturnType<typeof writingDelta>) => ({ net: delta.net, added: delta.added, deleted: delta.deleted })

describe('writingDelta', () => {
  it('counts new words as net and added', () => {
    expect(counts(writingDelta('One two.\n', 'One two.\n\nThree four five.\n'))).toEqual({ net: 3, added: 3, deleted: 0 })
  })

  it('counts a rewritten word as added and deleted, net zero', () => {
    expect(counts(writingDelta('The sea was calm.\n', 'The sea was wild.\n'))).toEqual({ net: 0, added: 1, deleted: 1 })
  })

  it('counts deletions as deleted only', () => {
    expect(counts(writingDelta('A b c.\n\nD e f.\n', 'A b c.\n'))).toEqual({ net: -3, added: 0, deleted: 3 })
  })

  it('does not count moving a paragraph within the text', () => {
    expect(counts(writingDelta('First part.\n\nSecond part here.\n\nThird.\n', 'Second part here.\n\nFirst part.\n\nThird.\n'))).toEqual({ net: 0, added: 0, deleted: 0 })
  })

  it('does not count a paste of text cut from another scene shortly before', () => {
    const cut = writingDelta('Keep.\n\nMove me to scene two.\n', 'Keep.\n')
    expect(counts(cut)).toEqual({ net: -5, added: 0, deleted: 5 })
    const paste = writingDelta('Scene two.\n', 'Scene two.\n\nMove me to scene two.\n', new Set(cut.removedBlocks))
    expect(counts(paste)).toEqual({ net: 5, added: 0, deleted: 0 })
  })
})
