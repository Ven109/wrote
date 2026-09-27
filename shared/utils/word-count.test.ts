import { describe, expect, it } from 'vitest'
import { countWords } from './word-count'

describe('countWords', () => {
  it.each([
    ['', 0],
    ['   ', 0],
    ['The tide was out.', 4],
    ['# Heading\n\nSome *emphasis* here.', 4],
    ['don\'t stop — well-known', 3],
    ['Über Straße, naïve café', 4],
  ])('counts %j as %i words', (text, expected) => {
    expect(countWords(text)).toBe(expected)
  })
})
