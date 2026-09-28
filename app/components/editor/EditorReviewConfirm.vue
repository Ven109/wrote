<script setup lang="ts">
import type { ReviewEstimate } from '#shared/schemas/review'

/** Confirms a whole-book review after showing its size (model calls and tokens). */
const props = defineProps<{ estimate: ReviewEstimate | null, agentName: string, starting: boolean }>()
const open = defineModel<boolean>('open', { default: false })
defineEmits<{ confirm: [] }>()
const format = useFormat().number
const cost = computed(() => (props.estimate?.cost != null ? ` (about $${props.estimate.cost.toFixed(2)})` : ''))
</script>

<template>
  <UModal
    v-model:open="open"
    :title="`Review the whole book with ${agentName}?`"
    description="Each scene is sent to your AI model once. Findings appear as comments as scenes are done; you can cancel from the jobs menu."
  >
    <template #body>
      <dl
        v-if="estimate"
        class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm"
      >
        <dt class="text-muted">
          Scenes
        </dt>
        <dd>{{ format(estimate.scenes) }}</dd>
        <dt class="text-muted">
          Model calls
        </dt>
        <dd>{{ format(estimate.calls) }}</dd>
        <dt class="text-muted">
          Tokens
        </dt>
        <dd>~{{ format(estimate.inputTokens) }} in, ~{{ format(estimate.outputTokens) }} out{{ cost }}</dd>
      </dl>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          label="Cancel"
          class="min-h-11 lg:min-h-0"
          @click="open = false"
        />
        <UButton
          label="Start review"
          icon="i-lucide-play"
          class="min-h-11 lg:min-h-0"
          :loading="starting"
          @click="$emit('confirm')"
        />
      </div>
    </template>
  </UModal>
</template>
