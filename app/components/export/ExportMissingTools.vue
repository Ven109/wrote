<script setup lang="ts">
import type { ExportTool } from '#shared/schemas/export'

defineProps<{ missing: { tool: ExportTool, hint: string }[], checking: boolean }>()
defineEmits<{ recheck: [] }>()
const NAMES: Record<ExportTool, string> = { pandoc: 'Pandoc', typst: 'Typst' }
</script>

<template>
  <UAlert
    color="warning"
    variant="subtle"
    icon="i-lucide-wrench"
    :title="`This format needs ${missing.map(m => NAMES[m.tool]).join(' and ')}`"
    :actions="[{ label: 'Check again', color: 'neutral', variant: 'outline', loading: checking, onClick: () => $emit('recheck') }]"
  >
    <template #description>
      <ul class="mt-1 flex flex-col gap-1">
        <li
          v-for="item in missing"
          :key="item.tool"
        >
          <span class="font-medium">{{ NAMES[item.tool] }}:</span> <code class="text-xs">{{ item.hint }}</code>
        </li>
      </ul>
      <p class="mt-1">
        The Docker image includes both. Markdown export always works.
      </p>
    </template>
  </UAlert>
</template>
