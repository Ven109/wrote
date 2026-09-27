import { describe, expect, it } from 'vitest'
import type { AiProviderView } from '#shared/schemas/ai'
import { modelSelectItems } from './model-options'

const provider = (id: AiProviderView['id'], label: string) => ({ id, label }) as AiProviderView

describe('modelSelectItems', () => {
  it('groups models by provider with provider:model values', () => {
    const items = modelSelectItems([provider('ollama', 'Ollama')], [{ provider: 'ollama', models: [{ id: 'llama3.2', label: 'llama3.2' }] }, { provider: 'openai', models: [] }])
    expect(items).toEqual([[{ type: 'label', label: 'Ollama', value: '' }, { label: 'llama3.2', value: 'ollama:llama3.2' }]])
  })

  it('keeps a custom current value selectable', () => {
    expect(modelSelectItems([], [], 'openrouter:x/y')[0]).toEqual([{ label: 'openrouter:x/y', value: 'openrouter:x/y' }])
  })
})
