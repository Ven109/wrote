import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { aiSettingsView, loadAiConfig, modelRefFor, parseModelRef, providerReady, resolveModel, updateAiSettings } from './ai-settings'
import { createTempDir } from '../../test/utils/workspace'

let workspace: string

beforeEach(async () => {
  workspace = await createTempDir('wrote-ai-')
})

describe('ai settings', () => {
  it('is unconfigured by default (app works without AI)', async () => {
    const view = aiSettingsView(await loadAiConfig(workspace, {}))
    expect(view.configured).toBe(false)
    expect(view.providers.every(p => !p.enabled && !p.hasKey)).toBe(true)
  })

  it('stores keys owner-only and never returns them', async () => {
    const view = await updateAiSettings(workspace, {
      providers: { anthropic: { enabled: true } },
      keys: { anthropic: 'sk-ant-secret' },
      models: { chat: 'anthropic:claude-sonnet-5' },
    })
    expect(JSON.stringify(view)).not.toContain('sk-ant-secret')
    expect(view.providers.find(p => p.id === 'anthropic')).toMatchObject({ enabled: true, hasKey: true, keySource: 'settings' })
    expect(view.configured).toBe(true)
    const secrets = join(workspace, '.wrote', 'secrets.json')
    expect((await stat(secrets)).mode & 0o777).toBe(0o600)
    expect(await readFile(join(workspace, '.wrote', 'ai-settings.json'), 'utf8')).not.toContain('sk-ant')

    const cleared = await updateAiSettings(workspace, { keys: { anthropic: null } })
    expect(cleared.providers.find(p => p.id === 'anthropic')?.hasKey).toBe(false)
  })

  it('uses environment keys as a fallback', async () => {
    await updateAiSettings(workspace, { providers: { openai: { enabled: true } } })
    const config = await loadAiConfig(workspace, { OPENAI_API_KEY: 'env-key' })
    expect(providerReady(config, 'openai')).toBe(true)
    expect(aiSettingsView(config).providers.find(p => p.id === 'openai')?.keySource).toBe('env')
  })

  it('local providers need no key and keep a custom base URL until cleared', async () => {
    await updateAiSettings(workspace, { providers: { ollama: { enabled: true, baseUrl: 'http://127.0.0.1:9999' } }, models: { chat: 'ollama:llama3.2' } })
    let config = await loadAiConfig(workspace, {})
    expect(resolveModel(config, 'ollama:llama3.2')).not.toBeNull()
    expect(config.settings.providers.ollama?.baseUrl).toBe('http://127.0.0.1:9999')
    await updateAiSettings(workspace, { providers: { ollama: { baseUrl: null } } })
    config = await loadAiConfig(workspace, {})
    expect(config.settings.providers.ollama).toEqual({ enabled: true })
  })

  it('resolves models only for ready providers', async () => {
    const config = await loadAiConfig(workspace, {})
    expect(resolveModel(config, 'anthropic:claude-sonnet-5')).toBeNull()
    expect(resolveModel(config, null)).toBeNull()
    expect(resolveModel(config, 'nope:model')).toBeNull()
  })

  it('parses model refs and falls back from fast to chat', () => {
    expect(parseModelRef('openrouter:anthropic/claude:beta')).toEqual({ provider: 'openrouter', model: 'anthropic/claude:beta' })
    expect(parseModelRef('bogus')).toBeNull()
    expect(modelRefFor({ models: { chat: 'a:b' } }, 'fast')).toBe('a:b')
    expect(modelRefFor({ models: { chat: 'a:b', fast: 'a:c' } }, 'fast')).toBe('a:c')
  })

  it('routes features to their own model, else their tier (autocomplete and summaries: fast)', () => {
    const models = { chat: 'a:chat', fast: 'a:fast', review: 'a:large' }
    expect(modelRefFor({ models }, 'review')).toBe('a:large')
    expect(modelRefFor({ models }, 'autocomplete')).toBe('a:fast')
    expect(modelRefFor({ models }, 'assistant')).toBe('a:chat')
    expect(modelRefFor({ models: { chat: 'a:chat' } }, 'summaries')).toBe('a:chat')
    expect(modelRefFor({ models: {} }, 'review')).toBeNull()
  })

  it('saves a monthly budget and own model prices; null removes them', async () => {
    await updateAiSettings(workspace, { monthlyBudget: 20, prices: { 'ollama:big': { input: 1, output: 2 }, 'openai:x': { input: 3, output: 4 } } })
    const view = await updateAiSettings(workspace, { prices: { 'ollama:big': null } })
    expect(view.monthlyBudget).toBe(20)
    expect(view.prices).toEqual({ 'openai:x': { input: 3, output: 4 } })
    expect((await updateAiSettings(workspace, { monthlyBudget: null })).monthlyBudget).toBeNull()
  })

  it('keeps summaries off by default and patches one summary setting without resetting the other', async () => {
    expect(aiSettingsView(await loadAiConfig(workspace, {})).summaries).toEqual({ enabled: false, dailyTokenBudget: 100_000 })
    await updateAiSettings(workspace, { summaries: { dailyTokenBudget: 5000 } })
    const view = await updateAiSettings(workspace, { summaries: { enabled: true } })
    expect(view.summaries).toEqual({ enabled: true, dailyTokenBudget: 5000 })
  })

  it('does not lose concurrent updates', async () => {
    await Promise.all([
      updateAiSettings(workspace, { providers: { ollama: { enabled: true } } }),
      updateAiSettings(workspace, { providers: { ollama: { baseUrl: 'http://127.0.0.1:1' } } }),
      updateAiSettings(workspace, { models: { chat: 'ollama:x' } }),
    ])
    const config = await loadAiConfig(workspace, {})
    expect(config.settings).toMatchObject({ providers: { ollama: { enabled: true, baseUrl: 'http://127.0.0.1:1' } }, models: { chat: 'ollama:x' } })
  })
})
