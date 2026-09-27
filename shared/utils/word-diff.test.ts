import { describe, expect, it } from 'vitest'
import { wordChangeRatio } from './word-diff'

describe('wordChangeRatio', () => {
  it('is 0 for the same words and 1 for nothing in common', () => {
    expect(wordChangeRatio('The tide was out.', 'The  tide was OUT')).toBe(0)
    expect(wordChangeRatio('The tide was out.', 'Gulls screamed overhead.')).toBe(1)
    expect(wordChangeRatio('', '')).toBe(0)
    expect(wordChangeRatio('Text', '')).toBe(1)
  })

  it('measures partial rewrites by words in order', () => {
    expect(wordChangeRatio('one two three four', 'one two five four')).toBe(0.25)
    expect(wordChangeRatio('one two three four', 'one two three four five six seven eight')).toBe(0.5)
    expect(wordChangeRatio('a b c d', 'd c b a')).toBe(0.75)
  })
})
