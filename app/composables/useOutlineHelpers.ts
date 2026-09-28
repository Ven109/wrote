import { useQuery, useQueryCache } from '@pinia/colada'
import type { Beat, Outline } from '#shared/schemas/outline'
import type { OutlineProposal } from '#shared/schemas/outline-proposals'
import { bookKeys } from '~/queries/keys'
import { beatSheetsQuery } from '~/queries/outline'

export type OutlineHelperForm
  = | { kind: 'bridge', fromBeatId: string, toBeatId: string }
    | { kind: 'review', actId: string, templateId: string }

/** Select value for "whole outline" / "no beat sheet" (select items cannot be empty strings). */
export const HELPER_ALL = 'all'

const key = (title: string) => title.trim().toLowerCase()

/** The beat sheet that shares the most beat titles with the outline (at least two), if any. */
function likelyTemplate(outline: Outline, sheets: { id: string, outline: Outline }[]): string {
  const titles = new Set(outline.acts.flatMap(act => act.beats.map(beat => key(beat.title))))
  const scored = sheets.map(sheet => ({ id: sheet.id, score: sheet.outline.acts.flatMap(act => act.beats).filter(beat => titles.has(key(beat.title))).length }))
  const best = scored.sort((a, b) => b.score - a.score)[0]
  return best && best.score >= 2 ? best.id : HELPER_ALL
}

/**
 * The AI outline helpers: "suggest bridge beats" between two beats, "find plot holes" and "what's missing in
 * act N" (optionally against a beat sheet). Results arrive as proposals (ghost cards); nothing is written.
 */
export function useOutlineHelpers(bookId: MaybeRefOrGetter<string>, outline: MaybeRefOrGetter<Outline>) {
  const toast = useToast()
  const queryCache = useQueryCache()
  const form = ref<OutlineHelperForm | null>(null)
  const running = ref(false)
  const { data: sheets } = useQuery(() => ({ ...beatSheetsQuery, enabled: form.value?.kind === 'review' }))
  const beats = computed(() => toValue(outline).acts.flatMap(act => act.beats.map(beat => ({ act, beat }))))

  watch(sheets, (list) => {
    if (list && form.value?.kind === 'review' && form.value.templateId === HELPER_ALL) form.value.templateId = likelyTemplate(toValue(outline), list.sheets)
  })

  function openBridge(from?: Beat) {
    const list = beats.value
    const index = Math.max(0, from ? list.findIndex(item => item.beat.id === from.id) : 0)
    form.value = { kind: 'bridge', fromBeatId: list[index]?.beat.id ?? '', toBeatId: list[index + 1]?.beat.id ?? list[index]?.beat.id ?? '' }
  }

  function openReview(actId = HELPER_ALL) {
    form.value = { kind: 'review', actId, templateId: sheets.value ? likelyTemplate(toValue(outline), sheets.value.sheets) : HELPER_ALL }
  }

  async function run() {
    const current = form.value
    if (!current || running.value) return
    running.value = true
    const base = `/api/books/${encodeURIComponent(toValue(bookId))}/outline/helpers`
    try {
      const created = current.kind === 'bridge'
        ? await $fetch<OutlineProposal[]>(`${base}/bridge`, { method: 'POST', body: { fromBeatId: current.fromBeatId, toBeatId: current.toBeatId } })
        : await $fetch<OutlineProposal[]>(`${base}/review`, { method: 'POST', body: { actId: current.actId === HELPER_ALL ? undefined : current.actId, templateId: current.templateId === HELPER_ALL ? undefined : current.templateId } })
      form.value = null
      void queryCache.invalidateQueries({ key: bookKeys.outlineProposals(toValue(bookId)) })
      toast.add(created.length
        ? { title: `${created.length} ${created.length === 1 ? 'proposal' : 'proposals'} added`, description: 'Accept or reject them on the outline.', color: 'success' }
        : { title: 'No suggestions this time', color: 'neutral' })
    }
    catch (error) {
      const notConfigured = (error as { data?: { data?: { code?: string } } }).data?.data?.code === 'ai_not_configured'
      toast.add(notConfigured
        ? { title: 'No AI model configured', description: 'Choose a chat model in AI settings.', color: 'warning', actions: [{ label: 'AI settings', to: '/settings/ai' }] }
        : { title: 'The outline helper failed', description: apiErrorMessage(error), color: 'error' })
    }
    finally {
      running.value = false
    }
  }

  const beatItems = computed(() => beats.value.map(({ act, beat }) => ({ label: `${act.title} › ${beat.title}`, value: beat.id })))
  const actItems = computed(() => [{ label: 'Whole outline (plot holes)', value: HELPER_ALL }, ...toValue(outline).acts.map(act => ({ label: act.title, value: act.id }))])
  const templateItems = computed(() => [{ label: 'No beat sheet', value: HELPER_ALL }, ...(sheets.value?.sheets ?? []).map(sheet => ({ label: sheet.title, value: sheet.id }))])
  const canRun = computed(() => {
    const current = form.value
    if (!current) return false
    return current.kind === 'bridge' ? Boolean(current.fromBeatId && current.toBeatId && current.fromBeatId !== current.toBeatId) : toValue(outline).acts.length > 0
  })

  return {
    form,
    open: computed({ get: () => form.value !== null, set: (value: boolean) => !value && (form.value = null) }),
    running,
    canRun,
    beatItems,
    actItems,
    templateItems,
    openBridge,
    openReview,
    run,
    /** "Bridge to next beat" is possible when there are at least two beats. */
    canBridge: computed(() => beats.value.length >= 2),
  }
}
