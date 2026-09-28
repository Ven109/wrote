<script setup lang="ts">
import type { WritingDay } from '#shared/schemas/writing'
import { heatmapWeeks } from '~/utils/goals-view'

const props = defineProps<{ days: WritingDay[], today: string }>()
const weeks = computed(() => heatmapWeeks(props.days, props.today))
const format = useFormat()
const LEVEL = ['bg-elevated', 'bg-primary/25', 'bg-primary/50', 'bg-primary/75', 'bg-primary']
</script>

<template>
  <section
    class="flex flex-col gap-2 rounded-lg border border-default p-4"
    aria-labelledby="heatmap-heading"
  >
    <h2
      id="heatmap-heading"
      class="text-sm font-semibold text-highlighted"
    >
      Writing days
    </h2>
    <div class="overflow-x-auto">
      <div
        class="flex gap-0.5"
        role="img"
        :aria-label="`Words written per day over the last year; ${days.filter(d => d.added > 0).length} days with writing`"
      >
        <div
          v-for="(week, index) in weeks"
          :key="index"
          class="flex flex-col gap-0.5"
        >
          <span
            v-for="cell in week"
            :key="cell.day"
            class="size-2.5 rounded-xs"
            :class="cell.future ? 'bg-transparent' : LEVEL[cell.level]"
            :title="cell.future ? undefined : `${cell.day}: ${format.number(cell.words)} words`"
          />
        </div>
      </div>
    </div>
  </section>
</template>
