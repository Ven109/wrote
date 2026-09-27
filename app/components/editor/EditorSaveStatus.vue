<script setup lang="ts">
import type { AutosaveStatus } from '~/composables/useAutosave'

const props = defineProps<{ status: AutosaveStatus }>()
defineEmits<{ keepMine: [], useTheirs: [], retry: [] }>()

const LABELS: Record<AutosaveStatus, { label: string, icon?: string }> = {
  idle: { label: '' },
  pending: { label: 'Unsaved', icon: 'i-lucide-circle-dot' },
  saving: { label: 'Saving…', icon: 'i-lucide-loader-circle' },
  saved: { label: 'Saved', icon: 'i-lucide-check' },
  conflict: { label: 'Conflict', icon: 'i-lucide-triangle-alert' },
  error: { label: 'Not saved', icon: 'i-lucide-cloud-off' },
}
const display = computed(() => LABELS[props.status])
</script>

<template>
  <div
    role="status"
    aria-live="polite"
    class="flex items-center"
  >
    <UDropdownMenu
      v-if="status === 'conflict'"
      :items="[
        { label: 'Keep my version', icon: 'i-lucide-save', onSelect: () => $emit('keepMine') },
        { label: 'Use version on disk', icon: 'i-lucide-hard-drive-download', onSelect: () => $emit('useTheirs') },
      ]"
    >
      <UButton
        :label="display.label"
        :icon="display.icon"
        color="warning"
        variant="soft"
        size="sm"
        aria-label="Resolve save conflict"
      />
    </UDropdownMenu>
    <UButton
      v-else-if="status === 'error'"
      :label="display.label"
      :icon="display.icon"
      color="error"
      variant="soft"
      size="sm"
      aria-label="Retry saving"
      @click="$emit('retry')"
    />
    <span
      v-else-if="display.label"
      class="flex items-center gap-1 text-xs text-muted"
    >
      <UIcon
        v-if="display.icon"
        :name="display.icon"
        class="size-3.5"
        :class="{ 'animate-spin motion-reduce:animate-none': status === 'saving' }"
      />
      {{ display.label }}
    </span>
  </div>
</template>
