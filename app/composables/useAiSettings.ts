import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import type { AiModelSlot, AiProviderId, AiSettingsView, UpdateAiSettingsInput } from '#shared/schemas/ai'
import { settingsKeys } from '~/queries/keys'
import { aiModelsQuery, aiSettingsQuery } from '~/queries/settings'
import { modelSelectItems } from '~/utils/model-options'

export interface ConnectionTest {
  ok: boolean
  message: string
  latencyMs: number
}

/** Whether AI is configured – AI features show a setup hint instead of failing when it is not. */
export function useAiStatus() {
  const { data, status } = useQuery(aiSettingsQuery)
  return { configured: computed(() => data.value?.configured ?? false), status }
}

/** AI settings page: providers, write-only API keys, default models and connection tests. */
export function useAiSettings() {
  const queryCache = useQueryCache()
  const toast = useToast()
  const { data: settings, status } = useQuery(aiSettingsQuery)
  const { data: modelGroups } = useQuery(() => aiModelsQuery('language'))
  const { data: embeddingGroups } = useQuery(() => aiModelsQuery('embedding'))
  const providers = computed(() => settings.value?.providers ?? [])
  const modelItems = (current?: string | null) => modelSelectItems(providers.value, modelGroups.value ?? [], current)
  const embeddingItems = (current?: string | null) => modelSelectItems(providers.value, embeddingGroups.value ?? [], current)
  const tests = ref<Partial<Record<AiProviderId, ConnectionTest | 'running'>>>({})

  const { mutateAsync } = useMutation({
    mutation: (patch: UpdateAiSettingsInput) => $fetch<AiSettingsView>('/api/settings/ai', { method: 'PATCH', body: patch }),
    onSuccess: view => queryCache.setQueryData(settingsKeys.ai(), view),
    onError: error => toast.add({ title: 'Could not save AI settings', description: apiErrorMessage(error), color: 'error' }),
    onSettled: () => queryCache.invalidateQueries({ key: settingsKeys.aiModels() }),
  })
  const update = (patch: UpdateAiSettingsInput) => mutateAsync(patch).catch(() => null)

  async function test(provider: AiProviderId, model: string) {
    tests.value = { ...tests.value, [provider]: 'running' }
    const result = await $fetch<ConnectionTest>('/api/settings/ai/test', { method: 'POST', body: { model } })
      .catch(error => ({ ok: false, message: apiErrorMessage(error), latencyMs: 0 }))
    tests.value = { ...tests.value, [provider]: result }
  }

  /** Model used by "Test connection": the chat model if it is from this provider, else its first model. */
  function testModelFor(id: AiProviderId): string | null {
    const chat = settings.value?.models.chat
    if (chat?.startsWith(`${id}:`)) return chat
    const first = modelGroups.value?.find(group => group.provider === id)?.models[0]
    return first ? `${id}:${first.id}` : null
  }

  return {
    settings,
    testModelFor,
    status,
    providers,
    modelItems,
    embeddingItems,
    tests,
    toggleProvider: (id: AiProviderId, enabled: boolean) => update({ providers: { [id]: { enabled } } }),
    setBaseUrl: (id: AiProviderId, baseUrl: string) => update({ providers: { [id]: { baseUrl: baseUrl.trim() || null } } }),
    saveKey: (id: AiProviderId, key: string) => update({ keys: { [id]: key.trim() } }),
    removeKey: (id: AiProviderId) => update({ keys: { [id]: null } }),
    setModel: (slot: AiModelSlot, ref: string | null) => update({ models: { [slot]: ref } }),
    test,
  }
}
