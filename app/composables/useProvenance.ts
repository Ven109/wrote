import { useQuery } from '@pinia/colada'
import type { EntryDocument } from '#shared/schemas/document'
import { PROVENANCE_CONTEXT, type ProvenanceContext } from '~/editor/provenance-context'
import { structureQuery } from '~/queries/manuscript'
import { entryProvenanceQuery, provenanceStatsQuery } from '~/queries/provenance'
import { aiShares } from '~/utils/provenance'

/**
 * Provenance of AI-assisted text for the write page: the "highlight AI-assisted passages" toggle (remembered)
 * and the AI-assisted share of the scene, its chapter and the book.
 */
export function useProvenance(bookId: MaybeRefOrGetter<string>, document: Ref<EntryDocument | undefined>) {
  const highlight = useCookie<boolean>('wrote-ai-highlight', { default: () => false })
  const entryId = () => document.value?.id ?? ''
  const { data: provenance } = useQuery(() => ({ ...entryProvenanceQuery({ bookId: toValue(bookId), entryId: entryId() }), enabled: Boolean(highlight.value && entryId()) }))
  const { data: stats } = useQuery(() => provenanceStatsQuery(toValue(bookId)))
  const { data: tree } = useQuery(() => structureQuery(toValue(bookId)))

  const context: ProvenanceContext = {
    shown: computed(() => (highlight.value ? provenance.value?.ranges ?? [] : [])),
  }
  provide(PROVENANCE_CONTEXT, context)

  return {
    highlight,
    toggle: () => (highlight.value = !highlight.value),
    shares: computed(() => aiShares(stats.value, tree.value ?? [], document.value?.id)),
    context,
  }
}
