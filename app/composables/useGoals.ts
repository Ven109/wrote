import { useQuery, useQueryCache } from '@pinia/colada'
import { goalsQuery } from '~/queries/goals'
import { bookKeys } from '~/queries/keys'
import { percent } from '~/utils/goals-view'

/** The book's writing goal and progress: target/deadline, today against the daily target, streaks, history. */
export function useGoals(bookId: MaybeRefOrGetter<string>) {
  const queryCache = useQueryCache()
  const toast = useToast()
  const { update } = useBook(bookId)
  const { data: progress, isPending, error } = useQuery(() => goalsQuery(toValue(bookId)))
  /** Today's net words against the daily target (0–100); `null` without a daily target. */
  const todayPercent = computed(() => (progress.value?.dailyTarget ? percent(progress.value.today.net, progress.value.dailyTarget) : null))
  const bookPercent = computed(() => (progress.value?.target ? percent(progress.value.totalWords, progress.value.target) : null))

  async function setGoal(target: number | null, deadline: string | null) {
    try {
      await update({ goals: { target, deadline } })
      toast.add({ title: target ? 'Goal saved' : 'Goal removed', color: 'success' })
    }
    catch (err) {
      toast.add({ title: 'Could not save the goal', description: apiErrorMessage(err), color: 'error' })
    }
    finally {
      await queryCache.invalidateQueries({ key: bookKeys.goals(toValue(bookId)) })
    }
  }

  return { progress, isPending, error, todayPercent, bookPercent, setGoal }
}
