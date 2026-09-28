<script setup lang="ts">
import type { GoalProgress } from '#shared/schemas/writing'

defineProps<{ progress: GoalProgress, todayPercent: number | null, bookPercent: number | null }>()
const n = useFormat().number
</script>

<template>
  <div class="grid gap-3 sm:grid-cols-3">
    <div class="flex flex-col gap-2 rounded-lg border border-default p-4">
      <p class="text-xs text-muted">
        Book
      </p>
      <p class="text-2xl font-semibold text-highlighted tabular-nums">
        {{ n(progress.totalWords) }}<span
          v-if="progress.target"
          class="text-base font-normal text-muted"
        > / {{ n(progress.target) }}</span>
      </p>
      <UProgress
        v-if="bookPercent !== null"
        :model-value="bookPercent"
        color="primary"
        size="sm"
        :aria-label="`${bookPercent}% of the word target`"
      />
      <p class="text-xs text-muted">
        <template v-if="progress.remaining !== null && progress.daysLeft !== null">
          {{ n(progress.remaining) }} to go · {{ progress.daysLeft }} {{ progress.daysLeft === 1 ? 'day' : 'days' }} left
        </template>
        <template v-else>
          Set a target and deadline below.
        </template>
      </p>
    </div>
    <div class="flex flex-col gap-2 rounded-lg border border-default p-4">
      <p class="text-xs text-muted">
        Today
      </p>
      <p class="text-2xl font-semibold text-highlighted tabular-nums">
        {{ n(progress.today.net) }}<span
          v-if="progress.dailyTarget"
          class="text-base font-normal text-muted"
        > / {{ n(progress.dailyTarget) }}</span>
      </p>
      <UProgress
        v-if="todayPercent !== null"
        :model-value="todayPercent"
        color="primary"
        size="sm"
        :aria-label="`${todayPercent}% of today's target`"
      />
      <p class="text-xs text-muted">
        {{ n(progress.today.added) }} written · {{ n(progress.today.deleted) }} deleted · {{ progress.today.minutes }} min
      </p>
    </div>
    <div class="flex flex-col gap-2 rounded-lg border border-default p-4">
      <p class="text-xs text-muted">
        Streak
      </p>
      <p class="text-2xl font-semibold text-highlighted tabular-nums">
        {{ progress.streak.current }} {{ progress.streak.current === 1 ? 'day' : 'days' }}
      </p>
      <p class="text-xs text-muted">
        Longest: {{ progress.streak.longest }} {{ progress.streak.longest === 1 ? 'day' : 'days' }}
      </p>
    </div>
  </div>
</template>
