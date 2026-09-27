import { describe, expect, it, vi } from 'vitest'
import type { AiConfig } from '../services/ai-settings'
import { listModels, testConnection } from './models'

const config = (providers: AiConfig['settings']['providers'] = {}): AiConfig => ({ settings: { providers, models: {}, summaries: { enabled: false, dailyTokenBudget: 100_000 }, autocomplete: false }, keys: {}, env: {} })

describe('testConnection', () => {
  it('reports success with latency', async () => {
    const generate = vi.fn(async () => ({ text: ' OK ' }))
    const result = await testConnection(config({ ollama: { enabled: true } }), 'ollama:llama3.2', generate)
    expect(result).toMatchObject({ ok: true, message: 'OK' })
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({ prompt: expect.stringContaining('OK'), maxOutputTokens: 16 }))
  })

  it('reports provider errors and unusable providers', async () => {
    const failing = await testConnection(config({ ollama: { enabled: true } }), 'ollama:x', async () => {
      throw new Error('connect ECONNREFUSED')
    })
    expect(failing).toMatchObject({ ok: false, message: 'connect ECONNREFUSED' })
    expect((await testConnection(config(), 'anthropic:claude-sonnet-5')).ok).toBe(false)
  })
})

describe('listModels', () => {
  it('lists installed Ollama models', async () => {
    const fetchFn = vi.fn(async () => ({ ok: true, json: async () => ({ models: [{ name: 'llama3.2:latest' }] }) }))
    const models = await listModels(config({ ollama: { enabled: true, baseUrl: 'http://host:11434/' } }), 'ollama', fetchFn)
    expect(models).toEqual([{ id: 'llama3.2:latest', label: 'llama3.2:latest' }])
    expect(fetchFn).toHaveBeenCalledWith('http://host:11434/api/tags', expect.anything())
  })

  it('lists OpenAI-compatible models and survives unreachable endpoints', async () => {
    const ok = vi.fn(async () => ({ ok: true, json: async () => ({ data: [{ id: 'qwen' }] }) }))
    expect(await listModels(config(), 'openai-compatible', ok)).toEqual([{ id: 'qwen', label: 'qwen' }])
    const down = vi.fn(async () => {
      throw new Error('down')
    })
    expect(await listModels(config(), 'openai-compatible', down)).toEqual([])
    expect((await listModels(config(), 'anthropic')).length).toBeGreaterThan(0)
  })
})
