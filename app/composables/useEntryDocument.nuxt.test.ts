import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { getQuery, readBody } from 'h3'
import type { EntryDocument } from '#shared/schemas/document'
import { useEntryDocument } from './useEntryDocument'

const PATH = 'manuscript/a/b/01-x.md'
let stored: EntryDocument = { id: 'scn_x00000001', path: PATH, type: 'scene', title: 'X', body: 'Hello\n', hash: 'h1' }
let saves: { body: string, expectedHash?: string }[] = []

registerEndpoint('/api/books/demo/document', { method: 'GET', handler: () => stored })
registerEndpoint('/api/books/demo/document', {
  method: 'PUT',
  async handler(event) {
    const input = await readBody<{ body: string, expectedHash?: string }>(event)
    saves.push(input)
    if (input.expectedHash !== stored.hash) throw createError({ statusCode: 409, statusMessage: 'Conflict' })
    stored = { ...stored, body: input.body, hash: `h${saves.length + 1}` }
    return stored
  },
})

async function mountDocument() {
  let api!: ReturnType<typeof useEntryDocument>
  await mountSuspended(defineComponent({
    setup() {
      api = useEntryDocument('demo', PATH)
      return () => h('div')
    },
  }))
  await vi.waitFor(() => expect(api.document.value?.hash).toBeTruthy())
  return api
}

describe('useEntryDocument', () => {
  it('loads the body into a trimmed draft that is not dirty', async () => {
    const api = await mountDocument()
    expect(api.draft.value).toBe('Hello')
    expect(api.dirty.value).toBe(false)
  })

  it('saves edits with the expected hash and a normalized body', async () => {
    saves = []
    const api = await mountDocument()
    const hash = api.document.value!.hash
    api.draft.value = 'Hello world'
    expect(api.dirty.value).toBe(true)
    await api.save()
    expect(saves).toEqual([{ path: PATH, body: 'Hello world\n', expectedHash: hash }])
    await vi.waitFor(() => expect(api.dirty.value).toBe(false))
    expect(api.draft.value).toBe('Hello world')
  })

  it('does not call the API when nothing changed', async () => {
    saves = []
    const api = await mountDocument()
    await api.save()
    expect(saves).toEqual([])
  })

  it('keeps the draft when the save conflicts', async () => {
    const api = await mountDocument()
    stored = { ...stored, hash: 'changed-elsewhere' }
    api.draft.value = 'My edit'
    await api.save()
    expect(api.draft.value).toBe('My edit')
    expect(api.dirty.value).toBe(true)
  })
})

describe('useEntryDocument when switching entries', () => {
  it('saves unsaved edits of the previous entry', async () => {
    const other: EntryDocument = { id: 'scn_y00000001', path: 'manuscript/a/b/02-y.md', type: 'scene', title: 'Y', body: 'Other\n', hash: 'y1' }
    registerEndpoint('/api/books/demo2/document', { method: 'GET', handler: event => (getQuery(event).path === other.path ? other : { ...stored, hash: 'x1' }) })
    const puts: string[] = []
    registerEndpoint('/api/books/demo2/document', {
      method: 'PUT',
      async handler(event) {
        const input = await readBody<{ path: string, body: string }>(event)
        puts.push(`${input.path}:${input.body}`)
        return { ...stored, body: input.body, hash: 'x2' }
      },
    })
    const path = ref(PATH)
    let api!: ReturnType<typeof useEntryDocument>
    await mountSuspended(defineComponent({
      setup() {
        api = useEntryDocument('demo2', path)
        return () => h('div')
      },
    }))
    await vi.waitFor(() => expect(api.document.value?.hash).toBe('x1'))
    api.draft.value = 'Unsaved'
    path.value = other.path
    await vi.waitFor(() => expect(api.draft.value).toBe('Other'))
    expect(puts).toEqual([`${PATH}:Unsaved\n`])
  })
})
