import { effectScope } from 'vue'
import { describe, expect, it } from 'vitest'
import { useCommandPalette } from './useCommandPalette'

describe('useCommandPalette', () => {
  it('collects registered groups', () => {
    const { groups, registerGroup, unregisterGroup } = useCommandPalette()
    registerGroup('test', () => ({ id: 'test', items: [{ label: 'Do it' }] }))
    expect(groups.value.map(g => g.id)).toContain('test')
    unregisterGroup('test')
    expect(groups.value.map(g => g.id)).not.toContain('test')
  })

  it('removes groups registered in a scope when the scope is disposed', () => {
    const scope = effectScope()
    const { groups } = useCommandPalette()
    scope.run(() => useCommandPalette().registerGroup('scoped', () => ({ id: 'scoped', items: [] })))
    expect(groups.value.map(g => g.id)).toContain('scoped')
    scope.stop()
    expect(groups.value.map(g => g.id)).not.toContain('scoped')
  })
})
