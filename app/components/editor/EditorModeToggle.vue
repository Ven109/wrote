<script setup lang="ts">
import type { EditorModePreference } from '~/composables/useEditorMode'

const { preference, setPreference } = useEditorMode()
const options: { label: string, value: EditorModePreference, icon: string }[] = [
  { label: 'Auto', value: 'auto', icon: 'i-lucide-wand-sparkles' },
  { label: 'Blocks', value: 'block', icon: 'i-lucide-blocks' },
  { label: 'Document', value: 'document', icon: 'i-lucide-file-text' },
]
</script>

<template>
  <USelect
    :model-value="preference"
    :items="options"
    :icon="options.find(option => option.value === preference)?.icon"
    aria-label="Editor mode"
    variant="ghost"
    size="sm"
    class="w-32"
    @update:model-value="setPreference($event as EditorModePreference)"
  />
</template>
