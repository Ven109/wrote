import { $fetch, fetch } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import type { ExportCapabilities } from '#shared/schemas/export'
import type { PresetList } from '#shared/schemas/export-preset'
import { exportCapabilities } from '../../server/export/tools'
import { setupApiServer } from '../utils/api-server'
import { createTestWorkspace } from '../utils/workspace'

const workspace = await createTestWorkspace()
await setupApiServer(workspace, import.meta.url)

// The server runs on this machine: the same tools are available to it.
const local = await exportCapabilities({ fresh: true })
const available = (format: string) => local.formats.find(f => f.format === format)?.available ?? false
const exportAs = (body: unknown) => fetch('/api/books/sample-book/export', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

describe('export API', () => {
  it('reports tools and formats; Markdown always works', async () => {
    const capabilities = await $fetch<ExportCapabilities>('/api/export/capabilities')
    expect(capabilities.tools.map(t => t.tool)).toEqual(['pandoc', 'typst'])
    expect(capabilities.formats.find(f => f.format === 'md')).toMatchObject({ available: true, needs: [] })
    const res = await exportAs({ format: 'md' })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-disposition')).toBe('attachment; filename="the-cartographer-of-hollow-bay.md"')
    expect(await res.text()).toMatch(/^---\ntitle: "The Cartographer of Hollow Bay"[\s\S]*# The Harbor \{#chp_harb0r0001\}/)
  })

  it('exports selected chapters and validates input', async () => {
    const res = await exportAs({ format: 'md', chapterIds: ['chp_gu1ld00001'], frontMatter: false })
    const text = await res.text()
    expect(text).toContain('Nobody at the Lantern')
    expect(text).not.toContain('The tide was out')
    expect(text).toContain('pagetitle:')
    expect((await exportAs({ format: 'rtf' })).status).toBe(400)
    expect((await exportAs({ format: 'md', chapterIds: ['chp_nope000001'] })).status).toBe(400)
  })

  it.runIf(available('epub'))('exports EPUB, DOCX and HTML with Pandoc', async () => {
    const epub = await exportAs({ format: 'epub' })
    expect(epub.headers.get('content-type')).toBe('application/epub+zip')
    expect(Buffer.from(await epub.arrayBuffer()).subarray(0, 2).toString()).toBe('PK')
    const docx = await exportAs({ format: 'docx' })
    expect(Buffer.from(await docx.arrayBuffer()).subarray(0, 2).toString()).toBe('PK')
    expect(await (await exportAs({ format: 'html' })).text()).toContain('<h1 id="chp_harb0r0001">The Harbor</h1>')
  })

  it.runIf(available('pdf'))('exports a PDF with Typst', async () => {
    const pdf = await exportAs({ format: 'pdf' })
    expect(pdf.status).toBe(200)
    expect(Buffer.from(await pdf.arrayBuffer()).subarray(0, 5).toString()).toBe('%PDF-')
  })

  it.skipIf(available('epub'))('explains how to install a missing tool', async () => {
    const res = await exportAs({ format: 'epub' })
    expect(res.status).toBe(409)
    const body = await res.json() as { data: { code: string, tools: string[], install: Record<string, string> } }
    expect(body.data).toMatchObject({ code: 'export_tool_missing', tools: ['pandoc'] })
    expect(body.data.install.pandoc).toBeTruthy()
  })
})

describe('export presets API', () => {
  const presets = '/api/books/sample-book/export/presets'
  const post = (path: string, body: unknown) => fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

  it('lists built-ins, saves, shares, imports and deletes book presets', async () => {
    expect((await $fetch<PresetList>(presets)).presets.map(p => p.id)).toContain('print-6x9')
    const saved = await post(presets, { id: 'my-print', preset: { name: 'My print', pdf: { trim: '6x9' } } })
    expect(saved.status).toBe(201)
    const file = await fetch(`${presets}/my-print/file`)
    expect(file.headers.get('content-disposition')).toBe('attachment; filename="my-print.yaml"')
    const yaml = await file.text()
    expect(yaml).toContain('trim: 6x9')
    expect((await post(`${presets}/import`, { id: 'copy', yaml })).status).toBe(201)
    const bad = await post(`${presets}/import`, { yaml: 'name: X\npdf:\n  trim: huge' })
    expect(bad.status).toBe(400)
    expect((await bad.json() as { statusMessage: string }).statusMessage).toMatch(/pdf\.trim/)
    expect((await post(presets, { id: 'manuscript', preset: { name: 'Mine' } })).status).toBe(400)
    expect((await fetch(`${presets}/copy`, { method: 'DELETE' })).status).toBe(204)
    expect((await $fetch<PresetList>(presets)).presets.map(p => p.id)).toEqual(expect.arrayContaining(['my-print']))
  })

  it('exports with a preset and rejects unknown presets', async () => {
    const md = await exportAs({ format: 'md', presetId: 'manuscript' })
    expect(md.status).toBe(200)
    expect((await exportAs({ format: 'md', presetId: 'nope' })).status).toBe(404)
  })
})
