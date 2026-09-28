import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { useAgentMentions } from './useAgentMentions'

registerEndpoint('/api/books/mention-book/review/agents', () => [
  { id: 'editor', name: 'Editor', description: '', instructions: 'x', scopes: ['scene'], task: 'chat', tools: [], summary: false, categories: [], source: 'builtin' },
  { id: 'victorian-dialogue', name: 'Victorian dialogue checker', description: '', instructions: 'x', scopes: ['scene'], task: 'chat', tools: [], summary: false, categories: [], source: 'book' },
])

describe('useAgentMentions', () => {
  it('suggests agents while @ is typed and shows who answers once one is picked', async () => {
    const input = ref('')
    let mentions!: ReturnType<typeof useAgentMentions>
    await mountSuspended(defineComponent({
      setup() {
        mentions = useAgentMentions('mention-book', input)
        return () => h('div')
      },
    }))
    input.value = '@'
    await vi.waitFor(() => expect(mentions.suggestions.value.map(agent => agent.id)).toEqual(['editor', 'victorian-dialogue']))
    input.value = '@vic'
    expect(mentions.suggestions.value.map(agent => agent.id)).toEqual(['victorian-dialogue'])
    mentions.pick('victorian-dialogue')
    expect(input.value).toBe('@victorian-dialogue ')
    expect(mentions.suggestions.value).toEqual([])
    expect(mentions.active.value?.name).toBe('Victorian dialogue checker')
    input.value = 'plain question'
    expect(mentions.active.value).toBeNull()
  })
})
