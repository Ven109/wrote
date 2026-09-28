import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { readBody } from 'h3'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import type { ExportCapabilities } from '#shared/schemas/export'
import { useExport, useExportDialog } from './useExport'

const capabilities: ExportCapabilities = {
  tools: [{ tool: 'pandoc', version: '3.1', path: 'pandoc' }, { tool: 'typst', version: null, path: null }],
  formats: [
    { format: 'epub', available: true, needs: ['pandoc'] },
    { format: 'pdf', available: false, needs: ['pandoc', 'typst'] },
    { format: 'md', available: true, needs: [] },
  ],
  install: { typst: 'brew install typst' },
}
const requests: unknown[] = []
registerEndpoint('/api/export/capabilities', () => capabilities)
registerEndpoint('/api/books/exp-book/export/presets', () => ({ presets: [
  { id: 'default', source: 'builtin', name: 'Default', formats: ['epub', 'pdf'] },
  { id: 'manuscript', source: 'builtin', name: 'Manuscript', formats: ['docx', 'pdf'] },
], errors: [] }))
registerEndpoint('/api/books/exp-book/structure', () => [{ id: 'prt_1', type: 'part', title: 'One', path: 'p', wordCount: 0, children: [
  { id: 'chp_1', type: 'chapter', title: 'Harbor', path: 'c1', wordCount: 0, children: [] },
  { id: 'chp_2', type: 'chapter', title: 'Guild', path: 'c2', wordCount: 0, children: [] },
] }])
registerEndpoint('/api/books/exp-book/export', { method: 'POST', handler: async (event) => {
  requests.push(await readBody(event))
  event.node.res.setHeader('content-disposition', 'attachment; filename="book.md"')
  return '# Book'
} })

async function mount() {
  let exporter!: ReturnType<typeof useExport>
  let dialog!: ReturnType<typeof useExportDialog>
  await mountSuspended(defineComponent({
    setup() {
      exporter = useExport('exp-book')
      dialog = useExportDialog()
      return () => h('div')
    },
  }))
  dialog.show()
  await vi.waitFor(() => expect(exporter.chapters.value).toHaveLength(2))
  await vi.waitFor(() => expect(exporter.formats.value).toHaveLength(3))
  return { exporter, dialog }
}

describe('useExport', () => {
  it('switches to a preset\'s default format', async () => {
    const { exporter } = await mount()
    await vi.waitFor(() => expect(exporter.presets.presets.value).toHaveLength(2))
    exporter.presets.presetId.value = 'manuscript'
    await vi.waitFor(() => expect(exporter.format.value).toBe('docx'))
  })

  it('explains which tool a format lacks and blocks the export', async () => {
    const { exporter } = await mount()
    expect(exporter.missing.value).toEqual([])
    exporter.format.value = 'pdf'
    expect(exporter.missing.value).toEqual([{ tool: 'typst', hint: 'brew install typst' }])
    expect(exporter.canExport.value).toBe(false)
  })

  it('exports selected chapters, downloads the file and closes the dialog', async () => {
    const { exporter, dialog } = await mount()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    exporter.format.value = 'md'
    exporter.scope.value = 'chapters'
    expect(exporter.canExport.value).toBe(false)
    exporter.chapterIds.value = ['chp_2']
    exporter.frontMatter.value = false
    await exporter.run()
    expect(requests.at(-1)).toEqual({ format: 'md', frontMatter: false, presetId: 'default', chapterIds: ['chp_2'] })
    expect(click).toHaveBeenCalled()
    expect(dialog.open.value).toBe(false)
  })
})
