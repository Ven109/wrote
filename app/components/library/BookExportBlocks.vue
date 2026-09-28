<script setup lang="ts">
import type { BlockExport } from '#shared/utils/directives'

/** Whether each custom block type is part of exports (notes and codex cards are working blocks). */
defineProps<{ saving: boolean }>()
const blocks = defineModel<Record<string, BlockExport>>({ required: true })
defineEmits<{ save: [] }>()
const TYPES = [
  { key: 'note', label: 'Notes', description: 'Working notes and to-dos in the text' },
  { key: 'callout', label: 'Callouts', description: 'Info, tip and warning boxes' },
  { key: 'codex-card', label: 'Codex cards', description: 'Codex entries shown in the text' },
  { key: 'scene-break', label: 'Scene breaks', description: '* * * between scenes' },
]
const OPTIONS = [{ label: 'Include', value: 'include' }, { label: 'Leave out', value: 'strip' }]
</script>

<template>
  <UCard>
    <form
      class="flex flex-col gap-4"
      aria-labelledby="export-blocks-heading"
      @submit.prevent="$emit('save')"
    >
      <div>
        <h2
          id="export-blocks-heading"
          class="font-medium text-highlighted"
        >
          Blocks in exports
        </h2>
        <p class="text-sm text-muted">
          What EPUB, PDF and other exports do with Wrote's own blocks.
        </p>
      </div>
      <UFormField
        v-for="type in TYPES"
        :key="type.key"
        :label="type.label"
        :description="type.description"
        orientation="horizontal"
      >
        <USelect
          v-model="blocks[type.key]"
          :items="OPTIONS"
          :aria-label="`${type.label} in exports`"
          class="w-36"
        />
      </UFormField>
      <UButton
        type="submit"
        label="Save"
        class="self-end"
        :loading="saving"
      />
    </form>
  </UCard>
</template>
