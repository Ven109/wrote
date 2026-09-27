import { describe, expect, it } from 'vitest'
import { chunkMarkdown, markdownBlocks, plainText } from './chunk'

const paragraphs = (count: number, prefix = 'Paragraph') =>
  Array.from({ length: count }, (_, i) => `${prefix} ${i} tells a small part of the story, with the harbor and the tide.`)

describe('markdownBlocks', () => {
  it('splits paragraphs, headings and keeps fenced code whole', () => {
    const md = '# Title\n\nFirst line\nsecond line\n\n```\ncode\n\nmore code\n```\n\nLast'
    expect(markdownBlocks(md)).toEqual(['# Title', 'First line\nsecond line', '```\ncode\n\nmore code\n```', 'Last'])
  })
})

describe('plainText', () => {
  it('drops markup and resolves wiki link labels', () => {
    expect(plainText('**Mara** met [[Hollow Bay|the bay]] and [[Lantern]]. See [site](http://x).')).toBe('Mara met the bay and Lantern. See site.')
    expect(plainText('- one\n> two')).toBe('one\ntwo')
  })
})

describe('chunkMarkdown', () => {
  it('prefixes chunks with the title and heading and numbers them', () => {
    const chunks = chunkMarkdown('Arrival', '## At the pier\n\nThe tide was out.', { boundaryModulus: 1 })
    expect(chunks).toEqual([expect.objectContaining({ seq: 0, heading: 'At the pier', text: 'Arrival › At the pier\n\nThe tide was out.' })])
  })

  it('starts a new chunk at every heading', () => {
    const chunks = chunkMarkdown('T', 'a\n\n# One\n\nb\n\n# Two\n\nc', { boundaryModulus: 1000 })
    expect(chunks.map(chunk => chunk.heading)).toEqual([null, 'One', 'Two'])
  })

  it('respects the size limit and splits long paragraphs at sentence ends', () => {
    const long = Array.from({ length: 40 }, (_, i) => `Sentence number ${i} is here.`).join(' ')
    const chunks = chunkMarkdown('T', long, { maxChars: 200, boundaryModulus: 1000 })
    expect(chunks.length).toBeGreaterThan(4)
    for (const chunk of chunks) expect(chunk.text.length).toBeLessThanOrEqual(200 + 3)
    expect(chunks.every(chunk => /\.$/.test(chunk.text))).toBe(true)
  })

  it('cuts a single oversized sentence hard', () => {
    const chunks = chunkMarkdown('T', 'x'.repeat(450), { maxChars: 200 })
    expect(chunks.map(chunk => chunk.text.length - 3)).toEqual([200, 200, 50])
  })

  it('keeps the hashes of chunks away from an edit', () => {
    const original = paragraphs(40)
    const before = chunkMarkdown('Scene', original.join('\n\n'))
    const beforeHashes = new Set(before.map(chunk => chunk.hash))
    expect(before.length).toBeGreaterThan(5)
    for (const index of [0, 17, 39]) {
      const edited = [...original]
      edited[index] = `Paragraph ${index} now says something completely different and much, much longer than before, to shift any length-based boundaries.`
      const after = chunkMarkdown('Scene', edited.join('\n\n'))
      const changed = after.filter(chunk => !beforeHashes.has(chunk.hash))
      // Only the edited chunk changes – plus the next one if the paragraph's boundary status flipped.
      expect(changed.length).toBeGreaterThanOrEqual(1)
      expect(changed.length).toBeLessThanOrEqual(2)
      expect(changed[0]!.text).toContain(`Paragraph ${index} now says`)
      expect(after.length - changed.length).toBeGreaterThanOrEqual(before.length - 2)
    }
  })

  it('is deterministic and returns nothing for an empty body', () => {
    expect(chunkMarkdown('T', paragraphs(5).join('\n\n'))).toEqual(chunkMarkdown('T', paragraphs(5).join('\n\n')))
    expect(chunkMarkdown('T', '  \n\n ')).toEqual([])
  })
})
