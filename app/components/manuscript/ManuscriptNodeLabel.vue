<script setup lang="ts">
import type { StructureNode } from '#shared/schemas/manuscript'
import { SCENE_STATUS_META } from '#shared/utils/scene-status'

const props = defineProps<{
  node: StructureNode
  active?: boolean
  dropPosition?: 'before' | 'after' | 'inside' | null
}>()

const status = computed(() => props.node.status ? SCENE_STATUS_META[props.node.status] : null)
</script>

<template>
  <span
    class="relative flex min-w-0 flex-1 items-center gap-2"
    :class="[
      active && 'font-medium text-highlighted',
      dropPosition === 'inside' && 'rounded ring-1 ring-primary',
      dropPosition === 'before' && 'before:absolute before:inset-x-0 before:-top-1 before:h-0.5 before:bg-primary',
      dropPosition === 'after' && 'after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:bg-primary',
    ]"
  >
    <span class="truncate">{{ node.title }}</span>
    <span
      v-if="status"
      class="size-1.5 shrink-0 rounded-full"
      :class="`bg-(--ui-${status.color === 'neutral' ? 'text-dimmed' : status.color})`"
      :title="status.label"
      :aria-label="`Status: ${status.label}`"
    />
  </span>
</template>
