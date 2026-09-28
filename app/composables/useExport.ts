import { useQuery } from '@pinia/colada'
import type { ExportFormat, ExportRequest } from '#shared/schemas/export'
import { exportCapabilitiesQuery } from '~/queries/export'
import { structureQuery } from '~/queries/manuscript'
import { useExportStore } from '~/stores/export'
import { chapterOptions, filenameFromDisposition } from '~/utils/export'

/** Opens and closes the export dialog from anywhere (top bar, command palette). */
export function useExportDialog() {
  const store = useExportStore()
  return {
    open: computed({ get: () => store.open, set: (value: boolean) => (store.open = value) }),
    show: () => (store.open = true),
  }
}

/**
 * The export dialog: format (with tool availability and install hints), scope (whole book or chapters),
 * front matter, and the download. A missing tool is explained instead of failing the export.
 */
export function useExport(bookId: MaybeRefOrGetter<string>) {
  const store = useExportStore()
  const toast = useToast()
  const { open } = useExportDialog()
  const { data: capabilities, refetch: recheck, isPending: checking } = useQuery(() => ({ ...exportCapabilitiesQuery, enabled: store.open }))
  // Shared with the sidebar tree: same key, so no `enabled` override here (it would switch the tree's query off too).
  const { data: structure } = useQuery(() => structureQuery(toValue(bookId)))
  const chapters = computed(() => chapterOptions(structure.value ?? []))

  const presets = useExportPresets(bookId, () => store.open)
  const format = ref<ExportFormat>('epub')
  // A preset brings its default format (e.g. print presets → PDF).
  watch(presets.preset, (preset, previous) => {
    if (preset && preset.id !== previous?.id) format.value = preset.formats[0]!
  })
  const scope = ref<'book' | 'chapters'>('book')
  const chapterIds = ref<string[]>([])
  const frontMatter = ref(true)
  const running = ref(false)

  const formats = computed(() => capabilities.value?.formats ?? [])
  const selected = computed(() => formats.value.find(item => item.format === format.value))
  /** Install hints for the tools the chosen format lacks (empty when it works). */
  const missing = computed(() => {
    const tools = capabilities.value?.tools ?? []
    return (selected.value?.needs ?? []).filter(tool => !tools.find(status => status.tool === tool)?.path)
      .map(tool => ({ tool, hint: capabilities.value?.install[tool] ?? '' }))
  })
  const canExport = computed(() => !running.value && !missing.value.length && (scope.value === 'book' || chapterIds.value.length > 0))

  async function run() {
    if (!canExport.value) return
    running.value = true
    const body: ExportRequest = { format: format.value, frontMatter: frontMatter.value, presetId: presets.presetId.value, ...(scope.value === 'chapters' ? { chapterIds: chapterIds.value } : {}) }
    try {
      const response = await $fetch.raw<Blob>(`/api/books/${encodeURIComponent(toValue(bookId))}/export`, { method: 'POST', body, responseType: 'blob' })
      download(response._data!, filenameFromDisposition(response.headers.get('content-disposition'), `book.${format.value}`))
      toast.add({ title: 'Export ready', description: 'The file was downloaded.', color: 'success' })
      store.open = false
    }
    catch (error) {
      toast.add({ title: 'Export failed', description: apiErrorMessage(error), color: 'error' })
    }
    finally {
      running.value = false
    }
  }

  return { open, presets, capabilities, checking, recheck, chapters, format, scope, chapterIds, frontMatter, formats, missing, canExport, running, run }
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
