import { describe, expect, it, vi } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import type { BookSummary } from '#shared/schemas/library'
import { useQueryCache } from '@pinia/colada'
import IndexPage from './index.vue'

const books: BookSummary[] = []
registerEndpoint('/api/books', () => books)

describe('library page', () => {
  it('shows an empty state without books', async () => {
    books.length = 0
    const page = await mountSuspended(IndexPage)
    expect(page.text()).toContain('Library')
    await vi.waitFor(() => expect(page.text()).toContain('No books yet'))
  })

  it('lists books as cards linking to the editor', async () => {
    books.push({ id: 'tide', title: 'The Long Tide', subtitle: null, author: 'A. Writer', language: 'en', template: 'novel', external: false, wordCount: 1234, scenes: 3, updatedAt: null, blockExport: {}, snapshotGit: false })
    await useQueryCache().invalidateQueries({ key: ['books'] })
    const page = await mountSuspended(IndexPage)
    await vi.waitFor(() => expect(page.text()).toContain('The Long Tide'))
    expect(page.find('a[href="/books/tide/write"]').exists()).toBe(true)
  })
})
