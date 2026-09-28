import { describe, expect, it } from 'vitest'
import { appendWikiLink, linkedTargets, rankTags } from './triage'

describe('triage helpers', () => {
  it('appends links to a trailing links paragraph or as a new paragraph', () => {
    expect(appendWikiLink('', 'Mara')).toBe('[[Mara]]\n')
    expect(appendWikiLink('An idea.\n', 'Mara')).toBe('An idea.\n\n[[Mara]]\n')
    expect(appendWikiLink('An idea.\n\n[[Mara]]\n', 'Hollow Bay')).toBe('An idea.\n\n[[Mara]] [[Hollow Bay]]\n')
  })

  it('knows which targets are already linked', () => {
    expect(linkedTargets('See [[Mara Velden]] and [[cdx_1|her]].')).toEqual(new Set(['mara velden', 'cdx_1']))
  })

  it('ranks tags of similar notes by frequency, without existing ones', () => {
    expect(rankTags([['plot', 'mara'], ['plot'], ['Idea', 'plot', 'mara'], ['sea']], ['idea'])).toEqual(['plot', 'mara', 'sea'])
  })
})
