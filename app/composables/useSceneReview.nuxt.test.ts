import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { createError, readBody } from 'h3'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import type { EntryDocument } from '#shared/schemas/document'
import { useSceneReview } from './useSceneReview'

const started: unknown[] = []
registerEndpoint('/api/books/rev-book/review/agents', () => [{ id: 'editor', name: 'Editor', description: '', instructions: 'x', scopes: ['scene', 'chapter', 'book'], task: 'chat', categories: [], source: 'builtin' }])
registerEndpoint('/api/books/rev-book/structure', () => [{ id: 'prt_1', type: 'part', title: 'One', path: 'p', wordCount: 0, children: [
  { id: 'chp_1', type: 'chapter', title: 'Harbor', path: 'c', wordCount: 0, children: [{ id: 'scn_1', type: 'scene', title: 'Arrival', path: 's', wordCount: 0, children: [] }] },
] }])
registerEndpoint('/api/books/rev-book/review/runs', { method: 'POST', handler: async (event) => {
  const body = await readBody(event)
  started.push(body)
  if (body.scope === 'book' && !body.confirmed) throw createError({ statusCode: 409, statusMessage: 'Confirm', data: { code: 'confirm_estimate', estimate: { scenes: 3, calls: 3, inputTokens: 9000, outputTokens: 2100, cost: null } } })
  return { run: { id: 'rvr_1' } }
} })

describe('useSceneReview', () => {
  it('offers each agent per scope, starts scene and chapter runs, and confirms the whole book', async () => {
    const document = ref({ id: 'scn_1', type: 'scene', path: 's', title: 'Arrival' } as EntryDocument)
    let review!: ReturnType<typeof useSceneReview>
    await mountSuspended(defineComponent({
      setup() {
        review = useSceneReview('rev-book', document)
        return () => h('div')
      },
    }))
    await vi.waitFor(() => expect(review.menu.value[0]).toHaveLength(1))
    const [agent] = review.menu.value[0]!
    const scopes = (agent as { children: { label: string, disabled: boolean, onSelect: () => Promise<void> }[] }).children
    await vi.waitFor(() => expect(scopes.map(scope => [scope.label, scope.disabled])).toEqual([['This scene', false], ['This chapter', false], ['Whole book…', false]]))
    await scopes[1]!.onSelect()
    expect(started.at(-1)).toEqual({ agentId: 'editor', scope: 'chapter', targetId: 'chp_1', confirmed: false })
    await scopes[2]!.onSelect()
    expect(review.confirmOpen.value).toBe(true)
    expect(review.estimate.value).toMatchObject({ scenes: 3 })
    await review.confirm()
    expect(started.at(-1)).toEqual({ agentId: 'editor', scope: 'book', confirmed: true })
    expect(review.confirmOpen.value).toBe(false)
  })
})
