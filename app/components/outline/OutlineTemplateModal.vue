<script setup lang="ts">
import type { BeatSheet } from '#shared/schemas/outline'

const props = defineProps<{
  sheets: BeatSheet[]
  loading: boolean
  folder: string
  preview: string
  canApply: boolean
}>()
const open = defineModel<boolean>('open', { default: false })
const selected = defineModel<string | undefined>('selected')
defineEmits<{ apply: [] }>()

const beatCount = (sheet: BeatSheet) => sheet.outline.acts.reduce((sum, act) => sum + act.beats.length, 0)
const items = computed(() => props.sheets.map(sheet => ({
  value: sheet.id,
  label: sheet.title,
  description: [sheet.description, `${sheet.outline.acts.length} acts · ${beatCount(sheet)} beats`].filter(Boolean).join(' '),
})))
</script>

<template>
  <UModal
    v-model:open="open"
    title="Apply a beat sheet"
    description="Adds the template's acts and beats that the outline does not have yet."
  >
    <template #body>
      <div class="space-y-4">
        <USkeleton
          v-if="loading"
          class="h-48 w-full"
        />
        <URadioGroup
          v-else
          v-model="selected"
          :items="items"
          variant="card"
          legend="Template"
        />
        <p
          v-if="preview"
          class="text-sm text-muted"
          aria-live="polite"
        >
          {{ preview }}
        </p>
        <p
          v-if="folder"
          class="text-xs text-dimmed"
        >
          Templates are Markdown files in <code class="break-all">{{ folder }}</code>: edit them or add your own.
        </p>
      </div>
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
          label="Apply"
          :disabled="!canApply"
          class="min-h-11 lg:min-h-0"
          @click="$emit('apply')"
        />
      </div>
    </template>
  </UModal>
</template>
