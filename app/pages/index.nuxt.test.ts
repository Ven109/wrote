import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import IndexPage from './index.vue'

describe('library page', () => {
  it('shows the library heading and empty state', async () => {
    const page = await mountSuspended(IndexPage)
    expect(page.text()).toContain('Library')
    expect(page.text()).toContain('No books yet')
  })
})
