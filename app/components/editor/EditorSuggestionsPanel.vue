<script setup lang="ts">
import type { SuggestionView } from '#shared/schemas/suggestion'

defineProps<{ suggestions: SuggestionView[], editingId: string | null, busy: boolean }>()
const open = defineModel<boolean>('open', { required: true })
const draft = defineModel<string>('draft', { required: true })
defineEmits<{ accept: [id: string, text?: string], reject: [id: string], edit: [id: string], cancel: [], jump: [id: string], acceptAll: [], rejectAll: [] }>()
</script>

<template>
  <USlideover
    v-model:open="open"
    title="Suggestions"
    description="Proposed by the assistant and connected AI tools. Nothing changes until you accept."
  >
    <template #body>
      <ul
        v-if="suggestions.length"
        class="flex flex-col gap-3"
        aria-label="Pending suggestions"
      >
        <EditorSuggestionCard
          v-for="suggestion in suggestions"
          :key="suggestion.id"
          v-model:draft="draft"
          :suggestion="suggestion"
          :editing="editingId === suggestion.id"
          :busy="busy"
          @accept="$emit('accept', suggestion.id)"
          @reject="$emit('reject', suggestion.id)"
          @edit="$emit('edit', suggestion.id)"
          @save="$emit('accept', suggestion.id, draft)"
          @cancel="$emit('cancel')"
          @jump="$emit('jump', suggestion.id)"
        />
      </ul>
      <BaseEmptyState
        v-else
        icon="i-lucide-check-check"
        title="No open suggestions"
        description="Ask the assistant to improve a passage – its proposals show up here and in the text."
      />
    </template>
    <template
      v-if="suggestions.length > 1"
      #footer
    >
      <div class="flex w-full gap-2">
        <UButton
          label="Accept all"
          icon="i-lucide-check-check"
          class="min-h-11 flex-1 justify-center"
          :loading="busy"
          @click="$emit('acceptAll')"
        />
        <UButton
          label="Reject all"
          icon="i-lucide-x"
          color="neutral"
          variant="soft"
          class="min-h-11 flex-1 justify-center"
          :disabled="busy"
          @click="$emit('rejectAll')"
        />
      </div>
    </template>
  </USlideover>
</template>
