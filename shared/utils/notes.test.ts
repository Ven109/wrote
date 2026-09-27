import { describe, expect, it } from 'vitest'
import { splitCapture } from './notes'

describe('splitCapture', () => {
  it('uses the first line as title and the rest as body', () => {
    expect(splitCapture('Lighthouse idea\n\nThe keeper drew the map.')).toEqual({ title: 'Lighthouse idea', body: 'The keeper drew the map.\n' })
  })

  it('strips heading marks and handles single lines', () => {
    expect(splitCapture('## Storm  ')).toEqual({ title: 'Storm', body: '' })
  })

  it('keeps long first lines in the body', () => {
    const line = 'word '.repeat(30).trim()
    const { title, body } = splitCapture(line)
    expect(title.length).toBeLessThanOrEqual(80)
    expect(title.endsWith('…')).toBe(true)
    expect(body).toBe(`${line}\n`)
  })
})
