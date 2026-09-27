<script setup lang="ts">
import type { SummarySettings } from '#shared/schemas/summaries'

defineProps<{ settings: SummarySettings }>()
defineEmits<{ update: [patch: Partial<SummarySettings>] }>()
</script>

<template>
  <div class="flex flex-col gap-4 rounded-lg border border-default p-4">
    <USwitch
      :model-value="settings.enabled"
      label="Keep summaries up to date"
      description="Summarizes scenes after significant edits and rolls them up into chapter, part and book summaries, so the assistant knows the whole book. Uses the fast model and sends your manuscript to it."
      @update:model-value="$emit('update', { enabled: $event })"
    />
    <UFormField
      label="Daily token budget"
      description="Summaries pause for the day once this many tokens are used."
    >
      <UInputNumber
        :model-value="settings.dailyTokenBudget"
        :min="1000"
        :max="10000000"
        :step="10000"
        :disabled="!settings.enabled"
        aria-label="Daily token budget"
        class="w-full sm:w-56"
        @update:model-value="$event && $emit('update', { dailyTokenBudget: $event })"
      />
    </UFormField>
  </div>
</template>
