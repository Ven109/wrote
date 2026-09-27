// @vitest-environment happy-dom
import { globSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseMarkdownFile } from '#shared/utils/frontmatter'
import { roundTrip } from '../../test/utils/headless-editor'
import { bodiesDiffer, toStoredBody } from './markdown'

const golden = (name: string) => readFileSync(join(import.meta.dirname, 'golden', name), 'utf8')

describe('Markdown round-trip (contract)', () => {
  it('keeps canonical Markdown byte-identical', () => {
    const source = golden('canonical.md')
    expect(toStoredBody(roundTrip(source))).toBe(source)
  })

  it.each(globSync('test/fixtures/sample-book/**/*.md'))('keeps the body of %s unchanged', (file) => {
    const { body } = parseMarkdownFile(readFileSync(file, 'utf8'))
    expect(toStoredBody(roundTrip(body))).toBe(toStoredBody(body))
  })

  it.each([
    ['***', '---'],
    ['* a\n* b', '- a\n- b'],
    ['__bold__ _em_', '**bold** *em*'],
  ])('normalizes %j to %j', (input, output) => {
    expect(roundTrip(input)).toBe(output)
  })
})

describe('toStoredBody', () => {
  it('ends non-empty bodies with exactly one newline', () => {
    expect(toStoredBody('text  \n\n')).toBe('text\n')
    expect(toStoredBody('')).toBe('')
    expect(toStoredBody('\n\n')).toBe('')
  })
})

describe('bodiesDiffer', () => {
  it('ignores trailing whitespace only', () => {
    expect(bodiesDiffer('a\n', 'a')).toBe(false)
    expect(bodiesDiffer('a', 'b')).toBe(true)
  })
})
