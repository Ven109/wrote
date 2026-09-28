import { mockNuxtImport, mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { getQuery, readBody } from 'h3'
import { useWikiLinks } from './useWikiLinks'

// Navigation itself is Nuxt's job; loading the target page (with the editor) would only slow these tests down.
const { navigateTo } = vi.hoisted(() => ({ navigateTo: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateTo)

const created: string[] = []
registerEndpoint('/api/books/wl/links/resolve', (event) => {
  const targets = [getQuery(event).targets].flat() as string[]
  return Object.fromEntries(targets.map(target => [target, target === 'Mara' ? { id: 'cdx_mara000001', path: 'codex/characters/mara.md', type: 'codex', title: 'Mara Velden' } : null]))
})
registerEndpoint('/api/books/wl/links/targets', () => [{ id: 'scn_a00000001', path: 'manuscript/a/b/01-a.md', type: 'scene', title: 'Arrival' }])
registerEndpoint('/api/books/wl/notes', {
  method: 'POST',
  async handler(event) {
    created.push((await readBody<{ text: string }>(event)).text)
    return { id: 'nte_n00000001', path: 'notes/inbox/nowhere.md' }
  },
})

async function mountLinks(markdown: string) {
  let api!: ReturnType<typeof useWikiLinks>
  await mountSuspended(defineComponent({
    setup() {
      api = useWikiLinks('wl', ref(markdown))
      return () => h('div')
    },
  }))
  return api
}

describe('useWikiLinks', () => {
  it('resolves links in the draft and marks broken ones', async () => {
    const api = await mountLinks('See [[Mara]] and [[Nowhere]].')
    await vi.waitFor(() => expect(api.resolve('Mara')).toEqual({ title: 'Mara Velden', href: '/books/wl/codex/codex/characters/mara.md', broken: false }))
    expect(api.resolve('Nowhere')).toEqual({ title: null, href: null, broken: true })
    await vi.waitFor(() => expect(api.pickerItems.value[0]![1]).toMatchObject({ kind: 'wikiLink', target: 'Arrival' }))
  })

  it('creates a note when following a broken link', async () => {
    const api = await mountLinks('[[Nowhere]]')
    await vi.waitFor(() => expect(api.resolve('Nowhere').broken).toBe(true))
    await api.open('Nowhere')
    expect(created).toEqual(['Nowhere'])
    expect(navigateTo).toHaveBeenCalledWith('/books/wl/notes/notes/inbox/nowhere.md', undefined)
  })
})
