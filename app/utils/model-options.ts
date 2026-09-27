import type { AiModelOption, AiProviderId, AiProviderView } from '#shared/schemas/ai'

export interface ModelSelectItem {
  label: string
  value: string
  type?: 'label'
}

/** Picker items grouped by provider (`provider:model` values), including a current value not in the lists. */
export function modelSelectItems(providers: AiProviderView[], groups: { provider: AiProviderId, models: AiModelOption[] }[], current?: string | null): ModelSelectItem[][] {
  const labelOf = new Map(providers.map(provider => [provider.id, provider.label]))
  const result = groups.filter(group => group.models.length).map(group => [
    { type: 'label' as const, label: labelOf.get(group.provider) ?? group.provider, value: '' },
    ...group.models.map(model => ({ label: model.label, value: `${group.provider}:${model.id}` })),
  ])
  const known = new Set(result.flat().map(item => item.value))
  if (current && !known.has(current)) result.unshift([{ label: current, value: current }])
  return result
}
