import { describe, expect, it } from 'vitest'
import { CONTAINER_DIRECTIVE, formatDirectiveAttrs, LEAF_DIRECTIVE, parseDirectiveAttrs, stripBlocksForExport } from './directives'

describe('directive attributes', () => {
  it('parse bare keys, plain and quoted values, and format them back', () => {
    const attrs = parseDirectiveAttrs('{variant=warning title="Mind the tide" todo}')
    expect(attrs).toEqual({ variant: 'warning', title: 'Mind the tide', todo: '' })
    expect(formatDirectiveAttrs(attrs)).toBe('{variant=warning title="Mind the tide" todo}')
    expect(formatDirectiveAttrs({ id: 'cdx_1', empty: null })).toBe('{id=cdx_1}')
    expect(formatDirectiveAttrs({})).toBe('')
  })

  it('match containers (also empty ones) and leaves', () => {
    expect(CONTAINER_DIRECTIVE.exec(':::note{todo=open}\nFix the tide.\n:::\n\nNext')!.slice(1, 4)).toEqual(['note', '{todo=open}', 'Fix the tide.'])
    expect(CONTAINER_DIRECTIVE.exec(':::note\n:::')![3]).toBeUndefined()
    expect(LEAF_DIRECTIVE.exec('::codex-card{id=cdx_mara000001}\n')!.slice(1, 3)).toEqual(['codex-card', '{id=cdx_mara000001}'])
  })
})

describe('stripBlocksForExport', () => {
  const source = [
    'Mara walked on.',
    '',
    ':::note{todo=open}',
    'Check the tide tables.',
    ':::',
    '',
    '::codex-card{id=cdx_mara000001}',
    '',
    ':::callout{variant=tip}',
    'Tip text.',
    ':::',
    '',
    '* * *',
    '',
    '```md',
    ':::note',
    'shown in code',
    ':::',
    '```',
  ].join('\n')

  it('leaves notes and codex cards out by default and keeps callouts, breaks and code', () => {
    expect(stripBlocksForExport(source)).toBe([
      'Mara walked on.',
      '',
      ':::callout{variant=tip}',
      'Tip text.',
      ':::',
      '',
      '* * *',
      '',
      '```md',
      ':::note',
      'shown in code',
      ':::',
      '```',
    ].join('\n'))
  })

  it('follows the book\'s per-block settings', () => {
    const kept = stripBlocksForExport(source, { 'note': 'include', 'callout': 'strip', 'codex-card': 'include', 'scene-break': 'strip' })
    expect(kept).toContain('Check the tide tables.')
    expect(kept).toContain('::codex-card')
    expect(kept).not.toContain('Tip text.')
    expect(kept).not.toMatch(/^\* \* \*$/m)
  })
})
