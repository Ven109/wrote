import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { getQuery, readBody } from 'h3'
import type { EntryDocument } from '#shared/schemas/document'
import { useEntryDocument } from './useEntryDocument'

const PATH = 'manuscript/a/b/01-x.md'
let stored: EntryDocument = { id: 'scn_x00000001', path: PATH, type: 'scene', title: 'X', body: 'Hello\n', hash: 'h1', frontmatter: {} }
let saves: { body: string, expectedHash?: string }[] = []

registerEndpoint('/api/books/demo/document', { method: 'GET', handler: () => stored })
registerEndpoint('/api/books/demo/document', {
  method: 'PUT',
  async handler(event) {
    const input = await readBody<{ body: string, expectedHash?: string }>(event)
    saves.push(input)
    if (input.expectedHash !== undefined && input.expectedHash !== stored.hash) throw createError({ statusCode: 409, statusMessage: 'Conflict' })
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
    expect(await api.save()).toBe('conflict')
    expect(api.draft.value).toBe('My edit')
    expect(api.dirty.value).toBe(true)
  })

  it('resolves conflicts by forcing or reloading', async () => {
    const api = await mountDocument()
    stored = { ...stored, body: 'Disk\n', hash: 'disk' }
    api.draft.value = 'Mine'
    expect(await api.save({ force: true })).toBe('saved')
    expect(stored.body).toBe('Mine\n')
    stored = { ...stored, body: 'Theirs\n', hash: 'theirs' }
    api.draft.value = 'Mine again'
    await api.reload()
    expect(api.draft.value).toBe('Theirs')
  })
})

describe('useEntryDocument when switching entries', () => {
  it('saves unsaved edits of the previous entry', async () => {
    const other: EntryDocument = { id: 'scn_y00000001', path: 'manuscript/a/b/02-y.md', type: 'scene', title: 'Y', body: 'Other\n', hash: 'y1', frontmatter: {} }
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

describe('useEntryDocument races', () => {
  it('does not lose edits when switching back before the previous save finished', async () => {
    const A = 'manuscript/a/b/01-a.md'
    const B = 'manuscript/a/b/02-b.md'
    const disk: Record<string, EntryDocument> = {
      [A]: { id: 'scn_a00000001', path: A, type: 'scene', title: 'A', body: '', hash: 'a0', frontmatter: {} },
      [B]: { id: 'scn_b00000001', path: B, type: 'scene', title: 'B', body: '', hash: 'b0', frontmatter: {} },
    }
    let release!: () => void
    const gate = new Promise<void>(resolve => (release = resolve))
    let version = 0
    registerEndpoint('/api/books/race/document', { method: 'GET', handler: event => disk[String(getQuery(event).path)] })
    registerEndpoint('/api/books/race/document', {
      method: 'PUT',
      async handler(event) {
        const input = await readBody<{ path: string, body: string, expectedHash?: string }>(event)
        if (input.path === A && disk[A]!.hash === 'a0') await gate
        if (input.expectedHash && input.expectedHash !== disk[input.path]!.hash) throw createError({ statusCode: 409 })
        disk[input.path] = { ...disk[input.path]!, body: input.body, hash: `v${++version}` }
        return disk[input.path]
      },
    })
    const path = ref(A)
    let api!: ReturnType<typeof useEntryDocument>
    await mountSuspended(defineComponent({
      setup() {
        api = useEntryDocument('race', path)
        return () => h('div')
      },
    }))
    await vi.waitFor(() => expect(api.document.value?.path).toBe(A))

    api.draft.value = 'first-1'
    path.value = B // save of A starts and hangs
    await vi.waitFor(() => expect(api.document.value?.path).toBe(B))
    path.value = A // back before the save finished
    await vi.waitFor(() => expect(api.document.value?.path).toBe(A))
    expect(api.draft.value).toBe('first-1')

    api.draft.value = 'first-1 first-2'
    const second = api.save()
    release()
    expect(await second).toBe('saved')
    expect(disk[A]!.body).toBe('first-1 first-2\n')
    expect(api.dirty.value).toBe(false)
  })
})

describe('useEntryDocument across page remounts', () => {
  it('saves on unmount and a new instance starts from the queued body', async () => {
    const P = 'manuscript/a/b/01-remount.md'
    let doc: EntryDocument = { id: 'scn_r00000001', path: P, type: 'scene', title: 'R', body: '', hash: 'r0', frontmatter: {} }
    let release!: () => void
    const gate = new Promise<void>(resolve => (release = resolve))
    registerEndpoint('/api/books/remount/document', { method: 'GET', handler: () => doc })
    registerEndpoint('/api/books/remount/document', {
      method: 'PUT',
      async handler(event) {
        const input = await readBody<{ body: string, expectedHash?: string }>(event)
        await gate
        if (input.expectedHash && input.expectedHash !== doc.hash) throw createError({ statusCode: 409 })
        doc = { ...doc, body: input.body, hash: `${doc.hash}+` }
        return doc
      },
    })
    const mountAt = async () => {
      let api!: ReturnType<typeof useEntryDocument>
      const wrapper = await mountSuspended(defineComponent({
        setup() {
          api = useEntryDocument('remount', P)
          return () => h('div')
        },
      }))
      await vi.waitFor(() => expect(api.document.value?.path).toBe(P))
      return { api, wrapper }
    }

    const first = await mountAt()
    first.api.draft.value = 'kept'
    first.wrapper.unmount()
    const second = await mountAt()
    expect(second.api.draft.value).toBe('kept')
    second.api.draft.value = 'kept and more'
    const saved = second.api.save()
    release()
    expect(await saved).toBe('saved')
    expect(doc.body).toBe('kept and more\n')
  })
})

describe('useEntryDocument after dispose', () => {
  it('ignores late saves from a disposed instance', async () => {
    const P = 'manuscript/a/b/01-late.md'
    const puts: string[] = []
    registerEndpoint('/api/books/late/document', { method: 'GET', handler: () => ({ id: 'scn_l00000001', path: P, type: 'scene', title: 'L', body: '', hash: 'l0', frontmatter: {} }) })
    registerEndpoint('/api/books/late/document', {
      method: 'PUT',
      async handler(event) {
        const input = await readBody<{ body: string }>(event)
        puts.push(input.body)
        return { id: 'scn_l00000001', path: P, type: 'scene', title: 'L', body: input.body, hash: `l${puts.length}`, frontmatter: {} }
      },
    })
    let api!: ReturnType<typeof useEntryDocument>
    const wrapper = await mountSuspended(defineComponent({
      setup() {
        api = useEntryDocument('late', P)
        return () => h('div')
      },
    }))
    await vi.waitFor(() => expect(api.document.value?.path).toBe(P))
    api.draft.value = 'stale'
    wrapper.unmount()
    await vi.waitFor(() => expect(puts).toEqual(['stale\n']))
    expect(await api.save()).toBe('unchanged')
    expect(puts).toEqual(['stale\n'])
  })
})
