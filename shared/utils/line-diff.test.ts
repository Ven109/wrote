import { describe, expect, it } from 'vitest'
import { diffHunks, diffLines } from './line-diff'

describe('diffLines', () => {
  it('marks removed, added and unchanged lines', () => {
    expect(diffLines('a\nb\nc\n', 'a\nx\nc\n')).toEqual([
      { kind: 'same', text: 'a' },
      { kind: 'removed', text: 'b' },
      { kind: 'added', text: 'x' },
      { kind: 'same', text: 'c' },
    ])
  })

  it('treats a missing file as empty', () => {
    expect(diffLines(null, 'new')).toEqual([{ kind: 'added', text: 'new' }])
    expect(diffLines('old', null)).toEqual([{ kind: 'removed', text: 'old' }])
  })
})

describe('diffHunks', () => {
  it('keeps changes with context and collapses long unchanged runs', () => {
    const before = ['1', '2', '3', '4', '5', '6', '7'].join('\n')
    const after = ['1', '2', '3', '4', '5', '6', 'seven'].join('\n')
    expect(diffHunks(diffLines(before, after), 1)).toEqual([
      null,
      { kind: 'same', text: '6' },
      { kind: 'removed', text: '7' },
      { kind: 'added', text: 'seven' },
    ])
  })
})
