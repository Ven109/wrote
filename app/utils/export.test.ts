import { describe, expect, it } from 'vitest'
import { exportChapterOptions, filenameFromDisposition } from './export'

describe('export helpers', () => {
  it('lists chapters in book order with their part', () => {
    const node = (id: string, type: 'part' | 'chapter' | 'scene', children: never[] = []) => ({ id, type, title: id.toUpperCase(), path: id, wordCount: 0, children })
    const structure = [node('p1', 'part', [node('c1', 'chapter', [node('s1', 'scene')] as never), node('c2', 'chapter')] as never), node('p2', 'part', [node('c3', 'chapter')] as never)]
    expect(exportChapterOptions(structure)).toEqual([{ id: 'c1', title: 'C1', part: 'P1' }, { id: 'c2', title: 'C2', part: 'P1' }, { id: 'c3', title: 'C3', part: 'P2' }])
  })

  it('reads the download file name', () => {
    expect(filenameFromDisposition('attachment; filename="the-map.epub"', 'book')).toBe('the-map.epub')
    expect(filenameFromDisposition(null, 'book.pdf')).toBe('book.pdf')
  })
})
