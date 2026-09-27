import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import IndexPage from './index.vue'

describe('index page', () => {
  it('shows the app name', async () => {
    const page = await mountSuspended(IndexPage)
    expect(page.text()).toContain('Wrote')
  })
})
