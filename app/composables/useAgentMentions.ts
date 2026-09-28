import { useQuery } from '@pinia/colada'
import { leadingAgentMention, typedAgentPrefix } from '#shared/utils/agent-mention'
import { reviewAgentsQuery } from '~/queries/review'

const MAX_SUGGESTIONS = 6

/**
 * `@agent` in the assistant prompt: while an `@id` is being typed, the matching review agents are offered;
 * once a message starts with a known agent, that agent answers the turn (shown as a chip).
 */
export function useAgentMentions(bookId: MaybeRefOrGetter<string>, input: Ref<string>) {
  const { data: agents } = useQuery(() => reviewAgentsQuery(toValue(bookId)))
  const suggestions = computed(() => {
    const prefix = typedAgentPrefix(input.value)
    if (prefix === null) return []
    return (agents.value ?? []).filter(agent => agent.id.startsWith(prefix) || agent.name.toLowerCase().startsWith(prefix)).slice(0, MAX_SUGGESTIONS)
  })
  const active = computed(() => {
    const mention = leadingAgentMention(input.value)
    return mention ? (agents.value ?? []).find(agent => agent.id === mention.agentId) ?? null : null
  })
  return {
    suggestions,
    active,
    pick: (agentId: string) => (input.value = `@${agentId} `),
  }
}
