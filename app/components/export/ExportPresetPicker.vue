<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { ExportPresetView, PresetError } from '#shared/schemas/export-preset'

const props = defineProps<{ presets: ExportPresetView[], errors: PresetError[], fileUrl: (id: string) => string }>()
const presetId = defineModel<string>({ required: true })
const emit = defineEmits<{ saveAs: [name: string], import: [file: File], remove: [id: string] }>()
const naming = ref(false)
const fileInput = useTemplateRef<HTMLInputElement>('file')
const items = computed(() => props.presets.map(preset => ({ value: preset.id, label: preset.name, description: preset.description })))
const current = computed(() => props.presets.find(preset => preset.id === presetId.value))
const actions = computed<DropdownMenuItem[][]>(() => [[
  { label: 'Save as new preset…', icon: 'i-lucide-save', onSelect: () => (naming.value = true) },
  { label: 'Download preset file', icon: 'i-lucide-file-down', to: props.fileUrl(presetId.value), download: `${presetId.value}.yaml`, external: true },
  { label: 'Import preset file…', icon: 'i-lucide-file-up', onSelect: () => fileInput.value?.click() },
], ...(current.value?.source === 'book' ? [[{ label: 'Delete preset', icon: 'i-lucide-trash', color: 'error' as const, onSelect: () => emit('remove', presetId.value) }]] : [])])

function picked(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) emit('import', file)
  ;(event.target as HTMLInputElement).value = ''
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-end gap-2">
      <UFormField
        label="Preset"
        :description="current?.description"
        class="flex-1"
      >
        <USelect
          v-model="presetId"
          :items="items"
          aria-label="Preset"
          class="w-full"
        />
      </UFormField>
      <BaseActionsMenu
        :items="actions"
        label="presets"
      />
    </div>
    <UAlert
      v-for="error in errors"
      :key="error.file"
      color="warning"
      variant="subtle"
      icon="i-lucide-file-warning"
      :title="`${error.file} was skipped`"
      :description="error.message"
    />
    <input
      ref="file"
      type="file"
      accept=".yaml,.yml,application/yaml,text/yaml"
      class="hidden"
      aria-label="Preset file"
      @change="picked"
    >
    <BasePromptModal
      v-model:open="naming"
      title="Save as new preset"
      :initial-value="current ? `${current.name} (copy)` : ''"
      @submit="emit('saveAs', $event)"
    />
  </div>
</template>
