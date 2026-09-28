import { useQuery } from '@pinia/colada'
import type { DropdownMenuItem } from '@nuxt/ui'
import type { EntryDocument } from '#shared/schemas/document'
import type { StructureNode } from '#shared/schemas/manuscript'
import type { ReviewEstimate, ReviewScope } from '#shared/schemas/review'
import { structureQuery } from '~/queries/manuscript'
import { reviewAgentsQuery, reviewRunsQuery } from '~/queries/review'

const SCOPE_LABELS: Record<ReviewScope, string> = { scene: 'This scene', chapter: 'This chapter', book: 'Whole book…' }

const chapterOf = (nodes: StructureNode[], sceneId: string, parent: StructureNode | null = null): StructureNode | null =>
  nodes.reduce<StructureNode | null>((found, node) => found ?? (node.id === sceneId ? parent : chapterOf(node.children, sceneId, node.type === 'chapter' ? node : parent)), null)

const errorData = (error: unknown) => (error as { data?: { data?: { code?: string, estimate?: ReviewEstimate } } }).data?.data

/**
 * Review agents on the open scene: the "Review" menu (agent × scene / chapter / whole book), the estimate the
 * author confirms before a whole-book run, and the scene's review history. Findings arrive as margin comments.
 */
export function useSceneReview(bookId: MaybeRefOrGetter<string>, document: Ref<EntryDocument | undefined>) {
  const toast = useToast()
  const sceneId = computed(() => (document.value?.type === 'scene' ? document.value.id : ''))
  const historyOpen = ref(false)
  const { data: agents } = useQuery(() => reviewAgentsQuery(toValue(bookId)))
  const { data: structure } = useQuery(() => structureQuery(toValue(bookId)))
  const { data: runs, status: runsStatus } = useQuery(() => reviewRunsQuery({ bookId: toValue(bookId), sceneId: sceneId.value, enabled: historyOpen.value }))
  const chapter = computed(() => (sceneId.value ? chapterOf(structure.value ?? [], sceneId.value) : null))
  const pending = ref<{ agentId: string, agentName: string, scope: ReviewScope } | null>(null)
  const estimate = ref<ReviewEstimate | null>(null)
  const starting = ref(false)

  async function start(agentId: string, agentName: string, scope: ReviewScope, confirmed = false) {
    const targetId = scope === 'scene' ? sceneId.value : scope === 'chapter' ? chapter.value?.id : undefined
    starting.value = true
    try {
      await $fetch(`/api/books/${encodeURIComponent(toValue(bookId))}/review/runs`, { method: 'POST', body: { agentId, scope, targetId, confirmed } })
      estimate.value = null
      pending.value = null
      toast.add({ title: `${agentName} is reviewing`, description: 'Findings appear as comments in the margin as each scene is done.', color: 'success' })
    }
    catch (error) {
      const data = errorData(error)
      if (data?.code === 'confirm_estimate' && data.estimate) {
        pending.value = { agentId, agentName, scope }
        estimate.value = data.estimate
      }
      else if (data?.code === 'ai_not_configured') toast.add({ title: 'No AI model configured', description: 'Choose a chat model in AI settings.', color: 'warning', actions: [{ label: 'AI settings', to: '/settings/ai' }] })
      else toast.add({ title: 'Could not start the review', description: apiErrorMessage(error), color: 'error' })
    }
    finally {
      starting.value = false
    }
  }

  const menu = computed<DropdownMenuItem[][]>(() => [
    (agents.value ?? []).map(agent => ({
      label: agent.name,
      icon: 'i-lucide-bot',
      children: agent.scopes.map(scope => ({
        label: SCOPE_LABELS[scope],
        disabled: (scope === 'scene' && !sceneId.value) || (scope === 'chapter' && !chapter.value),
        onSelect: () => start(agent.id, agent.name, scope),
      })),
    })),
    [{ label: 'Review history', icon: 'i-lucide-history', disabled: !sceneId.value, onSelect: () => (historyOpen.value = true) }],
  ])

  return {
    menu,
    available: computed(() => Boolean(sceneId.value)),
    estimate,
    pending,
    starting,
    confirmOpen: computed({ get: () => estimate.value !== null, set: (open: boolean) => !open && (estimate.value = null) }),
    confirm: () => pending.value && start(pending.value.agentId, pending.value.agentName, pending.value.scope, true),
    historyOpen,
    runs: computed(() => runs.value ?? []),
    runsLoading: computed(() => runsStatus.value === 'pending'),
  }
}
