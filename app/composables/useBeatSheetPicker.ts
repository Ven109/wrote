import { useQuery } from '@pinia/colada'
import type { Outline, OutlineOp } from '#shared/schemas/outline'
import { beatSheetOps, countAdditions } from '#shared/utils/beat-sheet'
import { createRecordId } from '#shared/utils/ids'
import { beatSheetsQuery } from '~/queries/outline'

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

/** "Apply template": pick a beat sheet, preview what it adds, merge it into the outline (nothing is removed). */
export function useBeatSheetPicker(outline: MaybeRefOrGetter<Outline>, apply: (...ops: OutlineOp[]) => Promise<unknown>) {
  const toast = useToast()
  const open = ref(false)
  const { data, status } = useQuery(() => ({ ...beatSheetsQuery, enabled: open.value }))
  const sheets = computed(() => data.value?.sheets ?? [])
  const selectedId = ref<string>()
  watch(sheets, (list) => {
    if (!list.some(sheet => sheet.id === selectedId.value)) selectedId.value = list[0]?.id
  }, { immediate: true })
  const selected = computed(() => sheets.value.find(sheet => sheet.id === selectedId.value))

  const additions = computed(() => (selected.value ? countAdditions(beatSheetOps(toValue(outline), selected.value.outline, prefix => prefix)) : null))
  const preview = computed(() => {
    const count = additions.value
    if (!count) return ''
    if (!count.acts && !count.beats) return 'Nothing to add: the outline already has every beat of this template.'
    const parts = [count.acts && plural(count.acts, 'act'), count.beats && plural(count.beats, 'beat')].filter(Boolean)
    return `Adds ${parts.join(' and ')}. Existing acts and beats stay as they are.`
  })

  function applySelected() {
    const sheet = selected.value
    if (!sheet) return
    const ops = beatSheetOps(toValue(outline), sheet.outline, prefix => createRecordId(prefix, 10))
    open.value = false
    if (!ops.length) return
    const { beats } = countAdditions(ops)
    void apply(...ops)
    toast.add({ title: `Applied ${sheet.title}`, description: beats ? `${plural(beats, 'beat')} added to the outline.` : undefined, color: 'success' })
  }

  return {
    open,
    status,
    sheets,
    folder: computed(() => data.value?.folder ?? ''),
    selectedId,
    preview,
    canApply: computed(() => Boolean(additions.value && (additions.value.acts || additions.value.beats))),
    apply: applySelected,
  }
}
