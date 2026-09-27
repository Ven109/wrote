import { describe, expect, it } from 'vitest'
import { isSignificantChange, measureChange, shingles } from './text-change'

const scene = Array.from({ length: 12 }, (_, i) => `Sentence ${i} tells how Mara walked along the harbor wall at dusk.`).join(' ')

describe('text change', () => {
  it('builds word trigrams, ignoring case and punctuation', () => {
    expect([...shingles('The tide, the TIDE!')]).toEqual(['the tide the', 'tide the tide'])
    expect([...shingles('Hi there')]).toEqual(['hi', 'there'])
  })

  it('measures identical and unrelated texts', () => {
    expect(measureChange(scene, scene)).toEqual({ distance: 0, changed: 0 })
    expect(measureChange('one two three four', 'five six seven eight').distance).toBe(1)
    expect(measureChange('', '')).toEqual({ distance: 0, changed: 0 })
  })

  it('ignores typo fixes and small edits', () => {
    expect(isSignificantChange(scene, scene.replace('harbor wall', 'harbour wall'))).toBe(false)
    expect(isSignificantChange(scene, `${scene} She smiled.`)).toBe(false)
  })

  it('flags rewritten or added paragraphs', () => {
    const rewritten = scene.replace(/Sentence [0-3] tells how Mara walked along the harbor wall at dusk\./g, 'A storm broke over the bay and the fishing boats were torn from their moorings.')
    expect(isSignificantChange(scene, rewritten)).toBe(true)
    expect(isSignificantChange(scene, `${scene} ${'Then the guild came for her, and she ran through the market. '.repeat(3)}`)).toBe(true)
  })

  it('treats a short scene rewritten entirely as significant, a one-word change as not', () => {
    const short = 'Nobody at the Lantern would look her in the eye.'
    expect(isSignificantChange(short, 'Nobody at the Lantern would look him in the eye.')).toBe(false)
    expect(isSignificantChange(short, 'The guild master greeted her warmly and poured two cups of tea by the fire.')).toBe(true)
  })
})
