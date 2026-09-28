<script setup lang="ts">
/** Today's words against the daily target, in the editor header (links to the Goals page). */
const props = defineProps<{ bookId: string }>()
const { progress, todayPercent } = useGoals(() => props.bookId)
const circumference = 2 * Math.PI * 8
</script>

<template>
  <UButton
    v-if="progress && progress.dailyTarget"
    :to="`/books/${bookId}/goals`"
    color="neutral"
    variant="ghost"
    class="min-h-11 gap-1.5 lg:min-h-0"
    :aria-label="`Today ${progress.today.net} of ${progress.dailyTarget} words`"
  >
    <svg
      viewBox="0 0 20 20"
      class="size-5 -rotate-90"
      aria-hidden="true"
    >
      <circle
        cx="10"
        cy="10"
        r="8"
        class="fill-none stroke-(--ui-bg-accented)"
        stroke-width="3"
      />
      <circle
        cx="10"
        cy="10"
        r="8"
        class="fill-none stroke-(--ui-primary) transition-[stroke-dashoffset] motion-reduce:transition-none"
        stroke-width="3"
        stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="circumference * (1 - (todayPercent ?? 0) / 100)"
      />
    </svg>
    <span class="text-xs tabular-nums">{{ Math.max(0, progress.today.net).toLocaleString() }}/{{ progress.dailyTarget.toLocaleString() }}</span>
  </UButton>
</template>
