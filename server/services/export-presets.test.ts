import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createTestWorkspace } from '../../test/utils/workspace'
import { deletePreset, exportPresetFile, getPreset, importPreset, listPresets, savePreset } from './export-presets'
import { closeAllBooks, openBook, type BookContext } from './workspace'

let book: BookContext
beforeEach(async () => {
  await closeAllBooks()
  book = await openBook(await createTestWorkspace(), 'sample-book')
})
afterAll(() => closeAllBooks())

const writePresetFile = async (name: string, text: string) => {
  await mkdir(join(book.repository.root, '.wrote/presets'), { recursive: true })
  await writeFile(join(book.repository.root, '.wrote/presets', name), text)
}

describe('export presets', () => {
  it('offers the built-in presets with defaults filled in', async () => {
    const { presets } = await listPresets(book)
    expect(presets.map(p => p.id)).toEqual(['default', 'print-5x8', 'print-5.5x8.5', 'print-6x9', 'manuscript'])
    expect(await getPreset(book, 'print-6x9')).toMatchObject({ source: 'builtin', pdf: { trim: '6x9', font: 'Libertinus Serif' } })
    expect(await getPreset(book)).toMatchObject({ id: 'default', frontMatter: ['title', 'copyright', 'dedication', 'toc'] })
  })

  it('loads book presets from YAML files and reports invalid ones clearly', async () => {
    await writePresetFile('large-print.yaml', 'name: Large print\npdf:\n  trim: 6x9\n  fontSize: 14\n')
    await writePresetFile('broken.yaml', 'name: Broken\npdf:\n  trim: 7x10\n')
    await writePresetFile('bad-yaml.yml', 'name: [unclosed\n')
    const { presets, errors } = await listPresets(book)
    expect(presets.find(p => p.id === 'large-print')).toMatchObject({ source: 'book', pdf: { trim: '6x9', fontSize: 14, lineSpacing: 1.35 } })
    expect(errors.map(e => e.file)).toEqual(['.wrote/presets/bad-yaml.yml', '.wrote/presets/broken.yaml'])
    expect(errors[1]!.message).toMatch(/pdf\.trim/)
    await expect(getPreset(book, 'broken')).rejects.toThrow(/cannot be used.*pdf\.trim/)
    await expect(getPreset(book, 'nope')).rejects.toThrow(/nope/)
  })

  it('saves, shares and imports presets across books; built-ins are reserved', async () => {
    const saved = await savePreset(book, 'my-6x9', { ...(await getPreset(book, 'print-6x9')), name: 'My 6x9' })
    expect(saved.source).toBe('book')
    const { yaml, filename } = await exportPresetFile(book, 'my-6x9')
    expect(filename).toBe('my-6x9.yaml')
    expect(yaml).toContain('name: My 6x9')

    const other = await openBook(await createTestWorkspace(), 'sample-book')
    const imported = await importPreset(other, { yaml })
    expect(imported).toMatchObject({ id: 'my-6x9', name: 'My 6x9', pdf: { trim: '6x9' } })
    await expect(importPreset(other, { yaml: 'name: x\nmanuscript: maybe' })).rejects.toThrow(/manuscript/)
    await expect(savePreset(book, 'default', saved)).rejects.toThrow(/built-in/)
    await deletePreset(book, 'my-6x9')
    expect((await listPresets(book)).presets.map(p => p.id)).not.toContain('my-6x9')
  })
})
