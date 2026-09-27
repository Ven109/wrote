import { useQuery, useQueryCache } from '@pinia/colada'
import type { PendingApproval } from '#shared/schemas/permissions'
import { approvalsQuery } from '~/queries/approvals'
import { bookKeys } from '~/queries/keys'

/**
 * Tool calls from the assistant or MCP agents that wait for the author (`write` asks, `destructive` always
 * asks). Destructive ones are shown as a blocking dialog, the others as cards.
 */
export function useApprovals(bookId: MaybeRefOrGetter<string | null>) {
  const queryCache = useQueryCache()
  const toast = useToast()
  const { data } = useQuery(() => approvalsQuery(toValue(bookId) ?? ''))
  const pending = computed(() => data.value ?? [])
  const deciding = ref<string | null>(null)

  async function decide(approval: PendingApproval, approve: boolean) {
    const id = toValue(bookId)
    if (!id) return
    deciding.value = approval.id
    try {
      await $fetch(`/api/books/${encodeURIComponent(id)}/approvals/${approval.id}`, { method: 'POST', body: { approve } })
    }
    catch (error) {
      toast.add({ title: 'This request is no longer waiting', description: apiErrorMessage(error), color: 'warning' })
    }
    finally {
      deciding.value = null
      queryCache.setQueryData(bookKeys.approvals(id), pending.value.filter(a => a.id !== approval.id))
    }
  }

  return {
    /** Write calls, shown as cards. */
    cards: computed(() => pending.value.filter(a => a.permission !== 'destructive')),
    /** The oldest destructive call, shown as a dialog. */
    blocking: computed(() => pending.value.find(a => a.permission === 'destructive') ?? null),
    deciding,
    approve: (approval: PendingApproval) => decide(approval, true),
    deny: (approval: PendingApproval) => decide(approval, false),
  }
}
