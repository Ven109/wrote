<script setup lang="ts">
import { AI_FEATURES, FEATURE_TIER, type AiFeature, type AiModelSlot } from '#shared/schemas/ai'
import type { ModelSelectItem } from '~/utils/model-options'
import { FEATURE_INFO } from '~/utils/usage'

const props = defineProps<{ models: Partial<Record<AiModelSlot, string | null>>, items: (current?: string | null) => ModelSelectItem[][] }>()
defineEmits<{ set: [feature: AiFeature, ref: string | null] }>()
const fallback = (feature: AiFeature) => {
  const tier = FEATURE_TIER[feature]
  const ref = props.models[tier] ?? props.models.chat
  return `Uses the ${FEATURE_INFO[tier].label.toLowerCase()}${ref ? ` (${ref})` : ''} unless set.`
}
</script>

<template>
  <UCollapsible class="rounded-lg border border-default">
    <UButton
      label="Per-feature models"
      color="neutral"
      variant="ghost"
      trailing-icon="i-lucide-chevron-down"
      block
      size="lg"
      class="justify-between"
    />
    <template #content>
      <div class="flex flex-col gap-4 border-t border-default p-4">
        <SettingsAiModelField
          v-for="feature in AI_FEATURES"
          :key="feature"
          :model-value="models[feature] ?? null"
          :label="FEATURE_INFO[feature].label"
          :description="`${FEATURE_INFO[feature].description} ${fallback(feature)}`"
          :items="items(models[feature])"
          @update:model-value="$emit('set', feature, $event)"
        />
      </div>
    </template>
  </UCollapsible>
</template>
