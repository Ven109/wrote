import { describe, expect, it } from 'vitest'
import { applyBlockRestore, diffBlocks, splitBlocks } from './block-diff'

describe('block diff', () => {
  it('splits Markdown into blocks, keeping fenced code together', () => {
    expect(splitBlocks('# Title\n\nOne\ntwo\n\n\n```\na\n\nb\n```\n\nEnd\n')).toEqual(['# Title', 'One\ntwo', '```\na\n\nb\n```', 'End'])
    expect(splitBlocks(null)).toEqual([])
    expect(splitBlocks('---\nid: x\n---\nOne.\n\nTwo.\n')).toEqual(['---\nid: x\n---', 'One.', 'Two.'])
  })

  it('marks blocks as same, changed, added and removed', () => {
    const changes = diffBlocks('A\n\nB\n\nC\n\nD\n', 'A\n\nB2\n\nD\n\nE\n')
    expect(changes.map(c => [c.kind, c.before, c.after])).toEqual([
      ['same', 'A', 'A'],
      ['changed', 'B', 'B2'],
      ['removed', 'C', null],
      ['same', 'D', 'D'],
      ['added', null, 'E'],
    ])
  })

  it('ignores a frontmatter that only differs in its updated stamp', () => {
    const changes = diffBlocks('---\nid: x\nupdated: 2026-01-01\n---\nOne.\n', '---\nid: x\nupdated: 2026-09-28\n---\nOne.\n')
    expect(changes.map(c => c.kind)).toEqual(['same', 'same'])
  })

  it('restores single blocks from the snapshot, or all of them', () => {
    const changes = diffBlocks('A\n\nB\n\nC\n', 'A\n\nB2\n\nNew\n')
    expect(changes.map(c => c.kind)).toEqual(['same', 'changed', 'changed'])
    expect(applyBlockRestore(changes, new Set([1]))).toBe('A\n\nB\n\nNew\n')
    expect(applyBlockRestore(diffBlocks('A\n', 'A\n\nX\n'), new Set([1]))).toBe('A\n')
    expect(applyBlockRestore(changes, new Set(changes.map((_, i) => i)))).toBe('A\n\nB\n\nC\n')
    const withMeta = diffBlocks('---\nid: x\n---\nOne.\n', '---\nid: x\n---\nOne!\n')
    expect(applyBlockRestore(withMeta, new Set([1]))).toBe('---\nid: x\n---\nOne.\n')
  })
})
