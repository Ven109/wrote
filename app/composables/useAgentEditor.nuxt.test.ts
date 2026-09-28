import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { readBody } from 'h3'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import type { ReviewAgent } from '#shared/schemas/review'
import { useAgentEditor } from './useAgentEditor'

const editor: ReviewAgent = { id: 'editor', name: 'Editor', description: 'General read', instructions: 'Read it.', scopes: ['scene'], task: 'chat', tools: [], summary: false, categories: [], source: 'builtin' }
const calls: { method: string, url: string, body: unknown }[] = []
registerEndpoint('/api/books/ag-book/review/agents', () => [editor])
registerEndpoint('/api/books/ag-book/review/agent-files', () => ({ agents: [], problems: [{ file: 'agents/bad.md', message: 'instructions: Too small' }] }))
registerEndpoint('/api/books/ag-book/structure', () => [{ id: 'chp_1', type: 'chapter', title: 'Harbor', path: 'c', wordCount: 0, children: [{ id: 'scn_1', type: 'scene', title: 'Arrival', path: 's', wordCount: 0, children: [] }] }])
registerEndpoint('/api/books/ag-book/review/agents/victorian-dialogue-checker', { method: 'PUT', handler: async (event) => {
  const body = await readBody(event)
  calls.push({ method: 'PUT', url: 'victorian', body })
  return { ...body, source: 'book' }
} })
registerEndpoint('/api/books/ag-book/review/agents/test', { method: 'POST', handler: async (event) => {
  calls.push({ method: 'POST', url: 'test', body: await readBody(event) })
  return { scene: 'Arrival', findings: [{ quote: 'The tide', severity: 'low', category: 'anachronism', message: 'Fine.', suggestion: null }], summary: null }
} })

describe('useAgentEditor', () => {
  it('creates an agent with an id from its name, tests the draft on a scene and saves it', async () => {
    let agents!: ReturnType<typeof useAgentEditor>
    await mountSuspended(defineComponent({
      setup() {
        agents = useAgentEditor('ag-book')
        return () => h('div')
      },
    }))
    await vi.waitFor(() => expect(agents.sceneItems.value).toEqual([{ label: 'Harbor › Arrival', value: 'scn_1' }]))
    expect(agents.problems.value).toHaveLength(1)
    agents.create()
    agents.draft.value!.name = 'Victorian dialogue checker'
    agents.draft.value!.instructions = 'Flag modern words.'
    await nextTick()
    expect(agents.draft.value!.id).toBe('victorian-dialogue-checker')
    await agents.test()
    expect(calls.at(-1)).toMatchObject({ url: 'test', body: { sceneId: 'scn_1', agent: { id: 'victorian-dialogue-checker', instructions: 'Flag modern words.' } } })
    expect(agents.result.value?.findings).toHaveLength(1)
    await agents.save()
    expect(calls.at(-1)).toMatchObject({ method: 'PUT', body: { name: 'Victorian dialogue checker' } })
    expect(agents.isNew.value).toBe(false)
    expect(agents.selected.value).toBe('victorian-dialogue-checker')
  })

  it('shows built-ins read-only until customised into a copy with the same id', async () => {
    let agents!: ReturnType<typeof useAgentEditor>
    await mountSuspended(defineComponent({
      setup() {
        agents = useAgentEditor('ag-book')
        return () => h('div')
      },
    }))
    agents.edit(editor)
    expect(agents.draft.value).toBeNull()
    await vi.waitFor(() => expect(agents.current.value?.id).toBe('editor'))
    agents.customize()
    expect(agents.draft.value).toMatchObject({ id: 'editor', name: 'Editor', instructions: 'Read it.' })
    expect(agents.draft.value).not.toHaveProperty('source')
  })
})
