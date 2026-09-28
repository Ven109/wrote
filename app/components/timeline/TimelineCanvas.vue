<script setup lang="ts">
import type { TimelineItem } from '#shared/schemas/timeline'
import { itemBox, type TimelineLane, type TimelineTick } from '~/utils/timeline-layout'

const props = defineProps<{
  lanes: TimelineLane[]
  ticks: TimelineTick[]
  rangeStart: number
  perDay: number
  width: number
  flagged: Set<string>
  formatDay: (day: number) => string
}>()
const emit = defineEmits<{ move: [item: TimelineItem, key: number], open: [item: TimelineItem] }>()
const drag = useTimelineDrag(() => props.perDay, (item, key) => emit('move', item, key))

function release(item: TimelineItem) {
  suppressClick = drag.end(item)
}
let suppressClick = false
function open(item: TimelineItem) {
  if (suppressClick) suppressClick = false
  else emit('open', item)
}
</script>

<template>
  <div
    class="overflow-x-auto rounded-lg border border-default"
    role="region"
    aria-label="Timeline"
  >
    <div
      class="relative"
      :style="{ width: `${width + 160}px` }"
    >
      <div class="sticky top-0 flex h-8 border-b border-default bg-default text-xs text-muted">
        <div class="sticky left-0 z-20 w-40 shrink-0 bg-default" />
        <div class="relative flex-1">
          <span
            v-for="tick in ticks"
            :key="tick.day"
            class="absolute top-2 border-l border-default ps-1"
            :style="{ left: `${tick.x}px` }"
          >{{ formatDay(tick.day) }}</span>
        </div>
      </div>
      <div
        v-for="lane in lanes"
        :key="lane.id"
        class="flex border-b border-default last:border-b-0"
        :aria-label="lane.label"
        role="group"
      >
        <div class="sticky left-0 z-20 flex w-40 shrink-0 items-center truncate border-e border-default bg-default px-3 text-sm font-medium">
          {{ lane.label }}
        </div>
        <div class="relative h-13 flex-1">
          <TimelineItemBar
            v-for="item in lane.items"
            :key="item.id"
            v-bind="itemBox(item, rangeStart, perDay)"
            :item="item"
            :offset="drag.dragging.value === item.id ? drag.offset.value : 0"
            :dragging="drag.dragging.value === item.id"
            :flagged="flagged.has(item.id)"
            @pointerdown="drag.start($event, item)"
            @pointermove="drag.move"
            @pointerup="release(item)"
            @pointercancel="drag.cancel"
            @open="open(item)"
            @shift="emit('move', item, item.key + $event)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
