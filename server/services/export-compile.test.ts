import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createTestWorkspace } from '../../test/utils/workspace'
import { compileManuscript, planChapters } from './export-compile'
import { closeAllBooks, openBook, type BookContext } from './workspace'

let book: BookContext
beforeEach(async () => {
  await closeAllBooks()
  book = await openBook(await createTestWorkspace(), 'sample-book')
})
afterAll(() => closeAllBooks())

const ARRIVAL = 'manuscript/01-part-one/01-the-harbor/01-arrival.md'
const MAP = 'manuscript/01-part-one/01-the-harbor/02-the-map.md'

async function setBody(path: string, body: string) {
  const entry = await book.repository.read(path)
  await book.repository.write(path, { frontmatter: entry.frontmatter, body }, entry.hash)
}

describe('compileManuscript', () => {
  it('compiles the sample book into one clean document in book order', async () => {
    const compiled = await compileManuscript(book)
    expect(compiled).toMatchObject({ withParts: false, chapters: 2, scenes: 3 })
    const md = compiled.markdown
    expect(md.indexOf('# The Harbor {#chp_harb0r0001}')).toBeLessThan(md.indexOf('# The Drowned Guild'))
    expect(md).toContain('::: {#scn_arr1val001 .scene}\n\nThe tide was out when Mara reached Hollow Bay.')
    expect(md).toMatch(/She had promised herself she would never come back\.\n\n:::\n\n\* \* \*\n\n::: \{#scn_themap0001 \.scene\}/)
    expect(md).not.toContain('[[')
    expect(md).not.toContain('title:')
  })

  it('resolves links between chapters and scenes, keeps footnotes apart and strips working blocks', async () => {
    await setBody(ARRIVAL, 'Back to [[The Map]].[^1]\n\n:::note\nTODO\n:::\n\n[^1]: First.')
    await setBody(MAP, 'See [[The Harbor|the harbor chapter]].[^1]\n\n[^1]: Second.')
    await book.settle()
    const { markdown } = await compileManuscript(book)
    expect(markdown).toContain('Back to [The Map](#scn_themap0001).[^s1-1]')
    expect(markdown).toContain('See [the harbor chapter](#chp_harb0r0001).[^s2-1]')
    expect(markdown).toContain('[^s2-1]: Second.')
    expect(markdown).not.toContain('TODO')
  })

  it('exports only selected chapters and rejects unknown ones', async () => {
    const { markdown, chapters } = await compileManuscript(book, { chapterIds: ['chp_gu1ld00001'] })
    expect(chapters).toBe(1)
    expect(markdown).toContain('Nobody at the Lantern')
    expect(markdown).not.toContain('The tide was out')
    await expect(compileManuscript(book, { chapterIds: ['chp_nope000001'] })).rejects.toThrow(/do not exist/)
  })

  it('shows parts only when the book has more than one', () => {
    const node = (id: string, type: 'part' | 'chapter', children: never[] = []) => ({ id, type, title: id, path: id, wordCount: 0, children })
    expect(planChapters([node('p1', 'part', [node('c1', 'chapter')] as never)]).withParts).toBe(false)
    expect(planChapters([node('p1', 'part', [node('c1', 'chapter')] as never), node('p2', 'part', [node('c2', 'chapter')] as never)]).withParts).toBe(true)
  })
})
