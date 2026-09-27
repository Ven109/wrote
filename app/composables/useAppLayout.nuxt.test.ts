import { describe, expect, it } from 'vitest'
import { useAppLayout } from './useAppLayout'

describe('useAppLayout', () => {
  it('opens the sidebar and closes the assistant by default', () => {
    const { sidebarOpen, assistantOpen } = useAppLayout()
    expect(sidebarOpen.value).toBe(true)
    expect(assistantOpen.value).toBe(false)
  })

  it('toggles both panels', () => {
    const { sidebarOpen, assistantOpen, toggleSidebar, toggleAssistant } = useAppLayout()
    toggleSidebar()
    toggleAssistant()
    expect(sidebarOpen.value).toBe(false)
    expect(assistantOpen.value).toBe(true)
  })
})
