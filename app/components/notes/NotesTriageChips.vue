<script setup lang="ts">
import type { TriageChip } from '~/utils/triage-chips'

defineProps<{ chips: TriageChip[] }>()
defineEmits<{ accept: [chip: TriageChip], dismiss: [chip: TriageChip] }>()
</script>

<template>
  <section
    v-if="chips.length"
    aria-label="Triage suggestions"
    class="flex flex-wrap items-center gap-2"
  >
    <span class="text-xs text-muted">Suggestions</span>
    <UFieldGroup
      v-for="chip in chips"
      :key="chip.key"
      size="sm"
    >
      <UButton
        :icon="chip.icon"
        :label="chip.label"
        color="neutral"
        variant="soft"
        class="min-h-11 sm:min-h-0"
        :aria-label="chipActionLabel(chip)"
        @click="$emit('accept', chip)"
      />
      <UButton
        icon="i-lucide-x"
        color="neutral"
        variant="soft"
        class="min-h-11 sm:min-h-0"
        :aria-label="`Dismiss ${chip.label}`"
        @click="$emit('dismiss', chip)"
      />
    </UFieldGroup>
  </section>
</template>
