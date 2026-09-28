import { describe, expect, it } from 'vitest'
import { leadingAgentMention, typedAgentPrefix } from './agent-mention'

describe('agent mentions', () => {
  it('finds a leading @agent and the rest of the message', () => {
    expect(leadingAgentMention('@victorian-dialogue check this scene')).toEqual({ agentId: 'victorian-dialogue', rest: 'check this scene' })
    expect(leadingAgentMention('  @editor')).toEqual({ agentId: 'editor', rest: '' })
    expect(leadingAgentMention('ask @editor later')).toBeNull()
    expect(leadingAgentMention('mail@example.com')).toBeNull()
  })

  it('tells what is being typed for autocomplete', () => {
    expect(typedAgentPrefix('@')).toBe('')
    expect(typedAgentPrefix('@vic')).toBe('vic')
    expect(typedAgentPrefix('@vic ')).toBeNull()
    expect(typedAgentPrefix('hello')).toBeNull()
  })
})
