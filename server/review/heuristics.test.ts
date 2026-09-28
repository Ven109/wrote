import { describe, expect, it } from 'vitest'
import { lineHeuristics } from './heuristics'

describe('lineHeuristics', () => {
  it('flags filter words, dialogue-tag adverbs, passive voice with an agent, and close repetition', () => {
    const text = [
      'She felt the cold wind on her face.',
      '"Stay," she said quietly.',
      'The door was opened by the keeper.',
      'The lantern swung. The lantern creaked. She watched the lantern.',
      'Nothing else moved.',
    ].join(' ')
    const flags = lineHeuristics(text)
    expect(flags.map(flag => flag.category)).toEqual(expect.arrayContaining(['filter-words', 'adverbs', 'passive-voice', 'repetition']))
    expect(flags.find(flag => flag.category === 'adverbs')).toMatchObject({ quote: '"Stay," she said quietly.' })
    expect(flags.find(flag => flag.category === 'passive-voice')).toMatchObject({ quote: 'The door was opened by the keeper.' })
    expect(flags.find(flag => flag.category === 'repetition')!.note).toContain('"lantern" appears 3 times')
  })

  it('stays quiet on clean prose and reads wiki links as their text', () => {
    expect(lineHeuristics('The tide was out when Mara reached [[Hollow Bay]]. Gulls circled.')).toEqual([])
  })
})
