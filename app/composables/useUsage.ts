import { useQuery, useQueryCache } from '@pinia/colada'
import type { AiSettingsView } from '#shared/schemas/ai'
import { settingsKeys } from '~/queries/keys'
import { usageQuery } from '~/queries/settings'
import { budgetShare, featureLabel, groupShares } from '~/utils/usage'

/** The usage page: tokens and estimated cost by feature, model, book and month, and the monthly budget. */
export function useUsage() {
  const queryCache = useQueryCache()
  const toast = useToast()
  const months = ref(6)
  const { data: report, isPending, error } = useQuery(() => usageQuery(months.value))
  const withShares = <T extends { label: string }>(groups: T[], label: (group: T) => string = group => group.label) => {
    const shares = groupShares(groups as never)
    return groups.map((group, index) => ({ ...group, label: label(group), share: shares[index]! }))
  }
  const sections = computed(() => {
    const value = report.value
    if (!value) return []
    return [
      { id: 'feature', title: 'By feature', groups: withShares(value.byFeature, group => featureLabel(group.key)) },
      { id: 'model', title: 'By model', groups: withShares(value.byModel) },
      { id: 'book', title: 'By book', groups: withShares(value.byBook) },
      { id: 'month', title: 'By month', groups: withShares(value.byMonth) },
    ]
  })

  async function setBudget(budget: number | null) {
    try {
      const view = await $fetch<AiSettingsView>('/api/settings/ai', { method: 'PATCH', body: { monthlyBudget: budget } })
      queryCache.setQueryData(settingsKeys.ai(), view)
      toast.add({ title: budget ? 'Monthly budget saved' : 'Monthly budget removed', color: 'success' })
    }
    catch (err) {
      toast.add({ title: 'Could not save the budget', description: apiErrorMessage(err), color: 'error' })
    }
    finally {
      void queryCache.invalidateQueries({ key: settingsKeys.usage() })
    }
  }

  return {
    months,
    report,
    isPending,
    error,
    sections,
    budget: computed(() => report.value?.budget ?? null),
    budgetShare: computed(() => (report.value ? budgetShare(report.value.budget) : null)),
    setBudget,
  }
}
