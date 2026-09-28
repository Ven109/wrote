<script setup lang="ts">
import type { GoalProgress } from '#shared/schemas/writing'
import { chartGeometry } from '~/utils/goals-view'

const props = defineProps<{ progress: GoalProgress }>()
const format = useFormat()
const geometry = computed(() => chartGeometry(props.progress.history, props.progress, 600, 160))
</script>

<template>
  <section
    class="flex flex-col gap-2 rounded-lg border border-default p-4"
    aria-labelledby="chart-heading"
  >
    <h2
      id="chart-heading"
      class="text-sm font-semibold text-highlighted"
    >
      Words over time
    </h2>
    <p
      v-if="!geometry.line"
      class="text-sm text-muted"
    >
      Your progress appears here once you write.
    </p>
    <template v-else>
      <svg
        viewBox="-4 -4 608 168"
        class="h-40 w-full"
        role="img"
        :aria-label="`Words from ${geometry.firstDay} to ${progress.history.at(-1)?.day}${progress.target ? `, target ${format.number(progress.target)} by ${progress.deadline}` : ''}`"
        preserveAspectRatio="none"
      >
        <path
          v-if="geometry.targetLine"
          :d="geometry.targetLine"
          class="fill-none stroke-(--ui-text-dimmed)"
          stroke-width="1.5"
          stroke-dasharray="6 4"
          vector-effect="non-scaling-stroke"
        />
        <path
          :d="geometry.line"
          class="fill-none stroke-(--ui-primary)"
          stroke-width="2.5"
          vector-effect="non-scaling-stroke"
        />
      </svg>
      <div class="flex justify-between text-xs text-muted">
        <span>{{ geometry.firstDay }}</span>
        <span v-if="geometry.targetLine">– – target</span>
        <span>{{ geometry.lastDay }}</span>
      </div>
    </template>
  </section>
</template>
