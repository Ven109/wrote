import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import type { Outline } from '#shared/schemas/outline'
import type { OutlineProposal, ResolveOutlineProposalInput } from '#shared/schemas/outline-proposals'
import { bookKeys } from '~/queries/keys'
import { outlineProposalsQuery } from '~/queries/outline'
import { placeProposals, proposalSlot } from '~/utils/outline-proposals'

/**
 * Pending outline proposals as ghost cards: where each shows on the board, the ones listed above the outline,
 * and accept/reject. Resolved proposals disappear at once; accepting reloads the outline from the server.
 */
export function useOutlineProposals(bookId: MaybeRefOrGetter<string>, outline: MaybeRefOrGetter<Outline>) {
  const queryCache = useQueryCache()
  const toast = useToast()
  const key = () => bookKeys.outlineProposals(toValue(bookId))
  const { data } = useQuery(() => outlineProposalsQuery(toValue(bookId)))
  const pending = computed(() => data.value ?? [])
  const placement = computed(() => placeProposals(toValue(outline), pending.value))
  const busy = ref<string | null>(null)

  const { mutateAsync } = useMutation({
    mutation: ({ proposal, input }: { proposal: OutlineProposal, input: ResolveOutlineProposalInput }) =>
      $fetch(`/api/books/${encodeURIComponent(toValue(bookId))}/outline/proposals/${proposal.id}`, { method: 'POST', body: input }),
    onSuccess: (_result, { proposal, input }) => {
      queryCache.setQueryData(key(), pending.value.filter(candidate => candidate.id !== proposal.id))
      if (input.status === 'accepted') void queryCache.invalidateQueries({ key: bookKeys.outline(toValue(bookId)) })
    },
    onError: (error) => {
      toast.add({ title: 'Could not resolve the proposal', description: apiErrorMessage(error), color: 'error' })
      void queryCache.invalidateQueries({ key: key() })
    },
  })

  async function resolve(proposal: OutlineProposal, input: ResolveOutlineProposalInput) {
    busy.value = proposal.id
    try {
      await mutateAsync({ proposal, input })
    }
    catch {
      // Reported in onError.
    }
    finally {
      busy.value = null
    }
  }

  const beatTitle = (beatId: string) => toValue(outline).acts.flatMap(act => act.beats).find(beat => beat.id === beatId)?.title

  return {
    pending,
    busy,
    /** Ghost cards after `afterBeatId` in an act (`null`: before its first beat). */
    ghosts: (actId: string, afterBeatId: string | null) => placement.value.slots.get(proposalSlot(actId, afterBeatId)) ?? [],
    loose: computed(() => placement.value.loose),
    beatTitle,
    accept: (proposal: OutlineProposal) => resolve(proposal, { status: 'accepted', edits: {} }),
    reject: (proposal: OutlineProposal) => resolve(proposal, { status: 'rejected' }),
  }
}
