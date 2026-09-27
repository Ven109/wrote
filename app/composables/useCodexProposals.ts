import { useQuery, useQueryCache } from '@pinia/colada'
import type { CodexProposal, ResolveCodexProposalInput } from '#shared/schemas/codex-proposals'
import { codexListQuery, codexProposalsQuery } from '~/queries/codex'
import { bookKeys } from '~/queries/keys'
import { draftFrom, editsFrom, type ProposalDraft } from '~/utils/codex-proposals'

/**
 * Pending codex proposals ("Scan chapter" or an agent): review, edit, accept or reject. Accepting writes
 * the entry to the codex; nothing is written before.
 */
export function useCodexProposals(bookId: MaybeRefOrGetter<string>) {
  const queryCache = useQueryCache()
  const toast = useToast()
  const { data } = useQuery(() => codexProposalsQuery(toValue(bookId)))
  const { data: codex } = useQuery(() => codexListQuery({ bookId: toValue(bookId), query: {} }))
  const proposals = computed(() => data.value ?? [])
  const reviewOpen = ref(false)
  const busy = ref<string | null>(null)
  const editing = ref<string | null>(null)
  const draft = ref<ProposalDraft | null>(null)

  const titleOf = (id: string) => codex.value?.find(entry => entry.id === id)?.title

  async function resolve(proposal: CodexProposal, body: ResolveCodexProposalInput, done: string) {
    busy.value = proposal.id
    try {
      await $fetch(`/api/books/${encodeURIComponent(toValue(bookId))}/codex/proposals/${proposal.id}`, { method: 'POST', body })
      queryCache.setQueryData(bookKeys.codexProposals(toValue(bookId)), proposals.value.filter(p => p.id !== proposal.id))
      void queryCache.invalidateQueries({ key: bookKeys.codex(toValue(bookId)) })
      if (editing.value === proposal.id) editing.value = null
      toast.add({ title: done, description: proposal.title, color: 'success' })
    }
    catch (error) {
      toast.add({ title: 'Could not save your decision', description: apiErrorMessage(error), color: 'error' })
    }
    finally {
      busy.value = null
    }
  }

  return {
    proposals,
    reviewOpen,
    busy,
    editing,
    draft,
    titleOf,
    accept: (proposal: CodexProposal) => {
      const edits = editing.value === proposal.id && draft.value ? editsFrom(proposal, draft.value) : {}
      return resolve(proposal, { status: 'accepted', edits }, proposal.action === 'create' ? 'Added to the codex' : 'Codex entry updated')
    },
    reject: (proposal: CodexProposal) => resolve(proposal, { status: 'rejected' }, 'Proposal rejected'),
    edit: (proposal: CodexProposal) => {
      draft.value = draftFrom(proposal)
      editing.value = proposal.id
    },
    cancelEdit: () => (editing.value = null),
  }
}
