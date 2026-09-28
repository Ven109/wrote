import { useQuery, useQueryCache } from '@pinia/colada'
import type { ExportFormat } from '#shared/schemas/export'
import type { ExportPresetView } from '#shared/schemas/export-preset'
import { exportPresetsQuery } from '~/queries/export'
import { bookKeys } from '~/queries/keys'
import { slugify } from '#shared/utils/slug'

/**
 * Export presets of a book: pick one, save the current choice as a new preset, share a preset as a YAML file
 * and import one shared from another book.
 */
export function useExportPresets(bookId: MaybeRefOrGetter<string>, enabled: MaybeRefOrGetter<boolean> = true) {
  const queryCache = useQueryCache()
  const toast = useToast()
  const base = () => `/api/books/${encodeURIComponent(toValue(bookId))}/export/presets`
  const { data } = useQuery(() => ({ ...exportPresetsQuery(toValue(bookId)), enabled: toValue(enabled) }))
  const presets = computed(() => data.value?.presets ?? [])
  const errors = computed(() => data.value?.errors ?? [])
  const presetId = ref('default')
  const preset = computed(() => presets.value.find(item => item.id === presetId.value) ?? presets.value[0] ?? null)
  const refresh = () => queryCache.invalidateQueries({ key: bookKeys.exportPresets(toValue(bookId)) })

  async function attempt(title: string, action: () => Promise<ExportPresetView | null>) {
    try {
      const saved = await action()
      await refresh()
      if (saved) presetId.value = saved.id
      toast.add({ title, color: 'success' })
    }
    catch (error) {
      toast.add({ title: 'Preset not saved', description: apiErrorMessage(error), color: 'error' })
    }
  }

  /** Saves the selected preset under a new name, with `format` as its default format. */
  const saveAs = (name: string, format: ExportFormat) => attempt(`Preset "${name}" saved`, async () => {
    const { id: _id, source: _source, ...current } = preset.value!
    const formats = [format, ...current.formats.filter(item => item !== format)]
    return $fetch<ExportPresetView>(base(), { method: 'POST', body: { id: slugify(name) || 'preset', preset: { ...current, name, formats } } })
  })

  const importFile = (file: File) => attempt(`Preset imported from ${file.name}`, async () =>
    $fetch<ExportPresetView>(`${base()}/import`, { method: 'POST', body: { id: slugify(file.name.replace(/\.ya?ml$/i, '')) || undefined, yaml: await file.text() } }))

  const remove = (id: string) => attempt('Preset deleted', async () => {
    await $fetch(`${base()}/${id}`, { method: 'DELETE' })
    presetId.value = 'default'
    return null
  })

  return { presets, errors, presetId, preset, saveAs, importFile, remove, fileUrl: (id: string) => `${base()}/${id}/file` }
}
