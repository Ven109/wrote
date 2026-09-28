<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { TIMER_PRESETS } from '~/utils/session-timer'

/** Unobtrusive session clock: start/pause, plus a menu to pick a countdown, reset or hide it. */
const { durationMinutes = null } = defineProps<{ label: string, spoken: string, running: boolean, durationMinutes?: number | null }>()
const emit = defineEmits<{ toggle: [], reset: [], duration: [minutes: number | null], hide: [] }>()

const menu = computed<DropdownMenuItem[][]>(() => [
  TIMER_PRESETS.map(minutes => ({
    label: minutes === null ? 'Count up' : `${minutes} minute countdown`,
    type: 'checkbox' as const,
    checked: minutes === durationMinutes,
    onUpdateChecked: () => emit('duration', minutes),
  })),
  [
    { label: 'Reset', icon: 'i-lucide-rotate-ccw', onSelect: () => emit('reset') },
    { label: 'Hide timer', icon: 'i-lucide-eye-off', onSelect: () => emit('hide') },
  ],
])
</script>

<template>
  <div
    class="flex items-center rounded-md text-muted"
    data-testid="session-timer"
  >
    <UButton
      :icon="running ? 'i-lucide-pause' : 'i-lucide-play'"
      :label="label"
      color="neutral"
      variant="ghost"
      :aria-label="`${running ? 'Pause' : 'Start'} session timer, ${spoken}`"
      class="min-h-11 font-mono tabular-nums lg:min-h-0"
      @click="emit('toggle')"
    />
    <UDropdownMenu :items="menu">
      <UButton
        icon="i-lucide-chevron-down"
        color="neutral"
        variant="ghost"
        aria-label="Timer options"
        class="size-11 justify-center lg:size-auto"
      />
    </UDropdownMenu>
  </div>
</template>
