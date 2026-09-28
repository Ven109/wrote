<script setup lang="ts">
import { localDay } from '#shared/utils/goals'

const bookId = useRouteBookId()
const { progress, isPending, error, todayPercent, bookPercent, setGoal } = useGoals(bookId)
const today = localDay(new Date())
useSeoMeta({ title: 'Goals' })
</script>

<template>
  <div class="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 sm:p-6">
    <BasePageHeader
      title="Goals"
      description="Your word target, today's writing and your streak. Words moved around are not counted as written."
    />
    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      title="Could not load your progress"
      :description="apiErrorMessage(error)"
    />
    <p
      v-else-if="isPending"
      class="text-sm text-muted"
    >
      Loading…
    </p>
    <template v-else-if="progress">
      <GoalsSummary
        :progress="progress"
        :today-percent="todayPercent"
        :book-percent="bookPercent"
      />
      <GoalsForm
        :target="progress.target"
        :deadline="progress.deadline"
        @save="setGoal"
      />
      <GoalsChart :progress="progress" />
      <GoalsHeatmap
        :days="progress.days"
        :today="today"
      />
    </template>
  </div>
</template>
