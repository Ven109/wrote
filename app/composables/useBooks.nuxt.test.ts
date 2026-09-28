import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import type { BookSummary } from '#shared/schemas/library'
import { useBooks } from './useBooks'

const book = (id: string): BookSummary => ({ id, title: id, subtitle: null, author: null, language: 'en', template: 'blank', external: false, wordCount: 0, scenes: 0, updatedAt: null, blockExport: {}, snapshotGit: false })

let books: BookSummary[] = []
let failDelete = false
registerEndpoint('/api/books', { method: 'GET', handler: () => books })
registerEndpoint('/api/books', {
  method: 'POST',
  handler: () => {
    books = [...books, book('new')]
    return { book: book('new'), firstScenePath: 'manuscript/a/b/01-x.md' }
  },
})
registerEndpoint('/api/books/a', {
  method: 'DELETE',
  handler: () => {
    if (failDelete) throw createError({ statusCode: 500, statusMessage: 'boom' })
    books = books.filter(b => b.id !== 'a')
    return null
  },
})

async function mountBooks() {
  let api!: ReturnType<typeof useBooks>
  await mountSuspended(defineComponent({
    setup() {
      api = useBooks()
      return () => h('div')
    },
  }))
  return api
}

describe('useBooks', () => {
  it('loads the list and refreshes it after creating a book', async () => {
    books = [book('a')]
    const api = await mountBooks()
    await vi.waitFor(() => expect(api.books.value.map(b => b.id)).toEqual(['a']))
    await api.createBook({ title: 'New' })
    await vi.waitFor(() => expect(api.books.value.map(b => b.id)).toEqual(['a', 'new']))
  })

  it('removes books optimistically and rolls back on failure', async () => {
    books = [book('a'), book('b')]
    failDelete = true
    const api = await mountBooks()
    await api.refresh()
    await vi.waitFor(() => expect(api.books.value).toHaveLength(2))
    await expect(api.removeBook('a')).rejects.toThrow()
    await vi.waitFor(() => expect(api.books.value.map(b => b.id)).toEqual(['a', 'b']))
    failDelete = false
    await api.removeBook('a')
    await vi.waitFor(() => expect(api.books.value.map(b => b.id)).toEqual(['b']))
  })
})
