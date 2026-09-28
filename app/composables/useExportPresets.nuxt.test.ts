import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { readBody } from 'h3'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import type { ExportPresetView, PresetList } from '#shared/schemas/export-preset'
import { useExportPresets } from './useExportPresets'

const preset = (id: string, source: 'builtin' | 'book' = 'builtin'): ExportPresetView => ({
  id, source, name: id, description: '', formats: ['epub', 'pdf'], manuscript: false, sceneBreak: '* * *',
  pdf: { trim: 'a5', margins: {}, font: 'Libertinus Serif', fontSize: 10.5, lineSpacing: 1.35, chapterStyle: 'centered' },
  frontMatter: ['title', 'toc'], backMatter: [],
})
const list: PresetList = { presets: [preset('default'), preset('print-6x9')], errors: [{ file: '.wrote/presets/bad.yaml', message: 'Invalid preset – pdf.trim: …' }] }
const saves: unknown[] = []
registerEndpoint('/api/books/pre-book/export/presets', { method: 'GET', handler: () => list })
registerEndpoint('/api/books/pre-book/export/presets', { method: 'POST', handler: async (event) => {
  const body = await readBody<{ id: string }>(event)
  saves.push(body)
  return preset(body.id, 'book')
} })
registerEndpoint('/api/books/pre-book/export/presets/import', { method: 'POST', handler: async (event) => {
  const body = await readBody<{ id: string, yaml: string }>(event)
  saves.push(body)
  return preset(body.id, 'book')
} })

async function mount() {
  let presets!: ReturnType<typeof useExportPresets>
  await mountSuspended(defineComponent({
    setup() {
      presets = useExportPresets('pre-book')
      return () => h('div')
    },
  }))
  await vi.waitFor(() => expect(presets.presets.value).toHaveLength(2))
  return presets
}

describe('useExportPresets', () => {
  it('lists presets and unreadable preset files', async () => {
    const presets = await mount()
    expect(presets.preset.value?.id).toBe('default')
    expect(presets.errors.value[0]!.file).toBe('.wrote/presets/bad.yaml')
  })

  it('saves the selected preset under a new name with the chosen format first, and imports files', async () => {
    const presets = await mount()
    presets.presetId.value = 'print-6x9'
    await presets.saveAs('My Print', 'pdf')
    expect(saves.at(-1)).toMatchObject({ id: 'my-print', preset: { name: 'My Print', formats: ['pdf', 'epub'] } })
    expect(presets.presetId.value).toBe('my-print')
    await presets.importFile(new File(['name: Shared'], 'Shared Layout.yaml'))
    expect(saves.at(-1)).toEqual({ id: 'shared-layout', yaml: 'name: Shared' })
  })
})
