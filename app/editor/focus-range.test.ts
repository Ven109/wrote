import { describe, expect, it } from 'vitest'
import { sentenceBounds } from './focus-range'

const text = 'The tide was out. Mara ran! Did she see it?'

describe('sentenceBounds', () => {
  it.each([
    [0, 'The tide was out.'],
    [10, 'The tide was out.'],
    [17, 'The tide was out.'],
    [18, 'Mara ran!'],
    [text.length, 'Did she see it?'],
  ])('finds the sentence around offset %i', (offset, sentence) => {
    const { from, to } = sentenceBounds(text, offset)
    expect(text.slice(from, to)).toBe(sentence)
  })

  it('returns an empty range for empty text', () => {
    expect(sentenceBounds('', 0)).toEqual({ from: 0, to: 0 })
  })
})
