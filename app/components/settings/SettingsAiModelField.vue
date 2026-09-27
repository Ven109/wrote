<script setup lang="ts">
import type { ModelSelectItem } from '~/utils/model-options'

defineProps<{ label: string, description: string, items: ModelSelectItem[][] }>()
const model = defineModel<string | null>({ required: true })
</script>

<template>
  <UFormField
    :label="label"
    :description="description"
  >
    <USelectMenu
      :model-value="model ?? undefined"
      :items="items"
      value-key="value"
      :create-item="{ position: 'bottom', when: 'always' }"
      placeholder="Choose or type provider:model"
      :aria-label="label"
      class="w-full"
      @update:model-value="model = ($event as string) || null"
      @create="model = $event"
    />
  </UFormField>
</template>
