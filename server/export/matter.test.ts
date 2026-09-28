import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BUILTIN_PRESETS } from './builtin-presets'
import { matterMarkdown, readMatter } from './matter'

const config = { title: 'The Map', author: 'A. Author' } as never

async function bookWith(files: Record<string, string>) {
  const root = await mkdtemp(join(tmpdir(), 'wrote-matter-'))
  await mkdir(join(root, 'matter'))
  await Promise.all(Object.entries(files).map(([name, text]) => writeFile(join(root, 'matter', name), text)))
  return root
}

describe('readMatter', () => {
  it('takes sections in preset order from matter files, with a generated copyright page', async () => {
    const root = await bookWith({ 'dedication.md': 'For M.\n', 'about-the-author.md': '---\nx: 1\n---\nLives by the sea.', 'acknowledgements.md': '  ' })
    const matter = await readMatter(root, config, BUILTIN_PRESETS.default!, { enabled: true, year: 2026 })
    expect(matter.title).toBe(true)
    expect(matter.toc).toBe(true)
    expect(matter.front.map(s => s.id)).toEqual(['copyright', 'dedication'])
    expect(matter.front[0]!.markdown).toContain('Copyright © 2026 A. Author')
    expect(matter.back).toEqual([{ id: 'about-the-author', title: 'About the Author', markdown: 'Lives by the sea.' }])
  })

  it('includes nothing when matter is off, and only the title page for manuscripts', async () => {
    const root = await bookWith({ 'dedication.md': 'For M.' })
    expect(await readMatter(root, config, BUILTIN_PRESETS.default!, { enabled: false })).toEqual({ title: false, toc: false, front: [], back: [] })
    expect(await readMatter(root, config, BUILTIN_PRESETS.manuscript!, { enabled: true })).toEqual({ title: true, toc: false, front: [], back: [] })
  })

  it('writes sections as unnumbered, unlisted headings', () => {
    expect(matterMarkdown([{ id: 'dedication', title: 'Dedication', markdown: 'For M.' }], 1)).toBe('# Dedication {.unnumbered .unlisted .dedication}\n\nFor M.')
  })
})
