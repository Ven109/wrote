import { describe, expect, it } from 'vitest'
import { anchorContext, locateAnchor, locateAnchorFuzzy } from './text-anchor'

describe('text anchors', () => {
  it('finds a unique passage and reports missing ones as stale', () => {
    expect(locateAnchor('The tide was out.', 'tide')).toEqual({ from: 4, to: 8 })
    expect(locateAnchor('The tide was out.', 'harbor')).toBeNull()
    expect(locateAnchor('anything', '')).toBeNull()
  })

  it('tells repeated passages apart by their surroundings', () => {
    const text = 'She waited. The door opened. He waited. The door closed.'
    const second = { from: text.lastIndexOf('The door'), to: text.lastIndexOf('The door') + 8 }
    const context = anchorContext(text, second)
    expect(context).toEqual({ before: 'She waited. The door opened. He waited. ', after: ' closed.' })
    expect(locateAnchor(text, 'The door', context)).toEqual(second)
  })

  it('follows the passage after edits elsewhere', () => {
    const text = 'She waited. The door opened. He waited. The door closed.'
    const context = anchorContext(text, { from: 40, to: 48 })
    const edited = `A new first line. ${text.replace('He waited', 'He paced')}`
    const found = locateAnchor(edited, 'The door', context)!
    expect(edited.slice(found.from, found.to + 7)).toBe('The door closed')
  })
})

describe('locateAnchorFuzzy', () => {
  const text = 'The tide was out when Mara reached the harbor. Gulls circled the empty boats. She had not been home in ten years.'
  const quote = 'Gulls circled the empty boats.'
  const context = anchorContext(text, { from: text.indexOf(quote), to: text.indexOf(quote) + quote.length })

  it('finds the passage exactly, or after edits around it', () => {
    expect(locateAnchorFuzzy(text, quote, context)).toEqual({ from: text.indexOf(quote), to: text.indexOf(quote) + quote.length })
    const edited = `A cold morning. ${text}`
    expect(edited.slice(locateAnchorFuzzy(edited, quote, context)!.from, locateAnchorFuzzy(edited, quote, context)!.to)).toBe(quote)
  })

  it('re-anchors after an edit inside the passage, between its unchanged surroundings', () => {
    const edited = text.replace('Gulls circled the empty boats.', 'Gulls wheeled above the empty boats.')
    const found = locateAnchorFuzzy(edited, quote, context)!
    expect(edited.slice(found.from, found.to)).toBe('Gulls wheeled above the empty boats.')
  })

  it('re-anchors on the first and last words when the surroundings changed too', () => {
    const long = 'Gulls circled the empty boats that nobody had moved in years, rocking gently.'
    const source = `Intro. ${long} Outro.`
    const ctx = anchorContext(source, { from: 7, to: 7 + long.length })
    const edited = `Completely new opening line! ${long.replace('nobody had moved', 'no one had touched')} And a new ending.`
    const found = locateAnchorFuzzy(edited, long, ctx)!
    expect(edited.slice(found.from, found.to)).toBe(long.replace('nobody had moved', 'no one had touched'))
  })

  it('is null when the passage is gone', () => {
    expect(locateAnchorFuzzy('The tide was out. She had not been home in ten years.', quote, context)).toBeNull()
    expect(locateAnchorFuzzy(text.replace(quote, 'x'), quote, context)).toBeNull()
  })
})
