<script setup lang="ts">
import { EXPORT_FORMATS } from '#shared/schemas/export'
import { FORMAT_INFO } from '~/utils/export'

const props = defineProps<{ bookId: string }>()
const exporter = useExport(() => props.bookId)
const { open, presets, chapters, format, scope, chapterIds, frontMatter, missing, canExport, running, checking } = exporter
const formatItems = EXPORT_FORMATS.map(value => ({ value, label: FORMAT_INFO[value].label, description: FORMAT_INFO[value].description }))
const scopeItems = [{ value: 'book', label: 'Whole book' }, { value: 'chapters', label: 'Selected chapters' }]
const chapterItems = computed(() => chapters.value.map(chapter => ({ value: chapter.id, label: chapter.title, description: chapter.part })))
</script>

<template>
  <UModal
    v-model:open="open"
    title="Export book"
    description="Compile the manuscript into one file. Working notes and codex cards are left out."
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <div class="flex flex-col gap-5">
        <ExportPresetPicker
          v-model="presets.presetId.value"
          :presets="presets.presets.value"
          :errors="presets.errors.value"
          :file-url="presets.fileUrl"
          @save-as="presets.saveAs($event, format)"
          @import="presets.importFile"
          @remove="presets.remove"
        />
        <URadioGroup
          v-model="format"
          legend="Format"
          :items="formatItems"
          variant="card"
          orientation="vertical"
        />
        <ExportMissingTools
          v-if="missing.length"
          :missing="missing"
          :checking="checking"
          @recheck="exporter.recheck()"
        />
        <URadioGroup
          v-model="scope"
          legend="What to export"
          :items="scopeItems"
          orientation="horizontal"
        />
        <UCheckboxGroup
          v-if="scope === 'chapters'"
          v-model="chapterIds"
          legend="Chapters"
          :items="chapterItems"
          class="max-h-56 overflow-y-auto"
        />
        <USwitch
          v-model="frontMatter"
          label="Front and back matter"
          description="Title page, copyright, dedication, contents, acknowledgements … as the preset lists them (from the matter/ folder)."
        />
      </div>
    </template>
    <template #footer>
      <UButton
        label="Cancel"
        color="neutral"
        variant="ghost"
        size="lg"
        @click="open = false"
      />
      <UButton
        label="Export"
        icon="i-lucide-download"
        size="lg"
        :loading="running"
        :disabled="!canExport"
        @click="exporter.run()"
      />
    </template>
  </UModal>
</template>
