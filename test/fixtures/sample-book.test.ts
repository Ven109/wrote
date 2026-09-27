import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { entryTypeFromPath } from '../../shared/book/layout'
import { BookConfigSchema, EntryIdSchema, parseFrontmatter } from '../../shared/schemas'
import { parseMarkdownFile } from '../../shared/utils/frontmatter'

const ROOT = join(import.meta.dirname, 'sample-book')

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? listFiles(join(dir, entry.name)) : [join(dir, entry.name)],
  )
}

const markdownFiles = listFiles(ROOT)
  .map(file => relative(ROOT, file).split(sep).join('/'))
  .filter(path => path.endsWith('.md'))

describe('sample book fixture', () => {
  it('has a valid book config', () => {
    const config = BookConfigSchema.parse(JSON.parse(readFileSync(join(ROOT, 'wrote.json'), 'utf8')))
    expect(config.title).toBe('The Cartographer of Hollow Bay')
  })

  it.each(markdownFiles)('%s is a valid entry', (path) => {
    const type = entryTypeFromPath(path)
    expect(type, `unknown entry location: ${path}`).not.toBeNull()
    const { data } = parseMarkdownFile(readFileSync(join(ROOT, path), 'utf8'))
    const frontmatter = parseFrontmatter(type!, data)
    expect(EntryIdSchema.parse(frontmatter.id)).toBe(frontmatter.id)
  })

  it('uses unique ids', () => {
    const ids = markdownFiles.map(path => parseMarkdownFile(readFileSync(join(ROOT, path), 'utf8')).data.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('preserves unknown frontmatter fields', () => {
    const { data } = parseMarkdownFile(readFileSync(join(ROOT, 'codex/characters/mara-velden.md'), 'utf8'))
    expect(parseFrontmatter('codex', data)).toMatchObject({ role: 'protagonist', eyes: 'grey' })
  })
})
