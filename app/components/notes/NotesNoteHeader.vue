<script setup lang="ts">
import type { AutosaveStatus } from '~/composables/useAutosave'

const props = defineProps<{ title: string, tags: string[], pinned: boolean, inInbox: boolean, status: AutosaveStatus, backTo: string }>()
const emit = defineEmits<{ rename: [title: string], tags: [tags: string[]], togglePin: [], file: [], keepMine: [], useTheirs: [], retry: [] }>()

const draftTitle = ref(props.title)
watch(() => props.title, (value) => {
  draftTitle.value = value
})
</script>

<template>
  <header class="flex flex-col gap-2">
    <div class="flex items-center gap-1">
      <UButton
        :to="backTo"
        icon="i-lucide-arrow-left"
        color="neutral"
        variant="ghost"
        aria-label="Back to notes"
        class="size-11 justify-center lg:hidden"
      />
      <UInput
        v-model="draftTitle"
        variant="ghost"
        size="xl"
        aria-label="Note title"
        class="min-w-0 flex-1"
        :ui="{ base: 'text-xl font-semibold px-0' }"
        @blur="emit('rename', draftTitle)"
        @keydown.enter.prevent="emit('rename', draftTitle)"
      />
      <EditorSaveStatus
        :status="status"
        @keep-mine="emit('keepMine')"
        @use-theirs="emit('useTheirs')"
        @retry="emit('retry')"
      />
      <UButton
        :icon="pinned ? 'i-lucide-pin-off' : 'i-lucide-pin'"
        :aria-label="pinned ? 'Unpin note' : 'Pin note'"
        :aria-pressed="pinned"
        :color="pinned ? 'primary' : 'neutral'"
        variant="ghost"
        class="size-11 justify-center lg:size-auto"
        @click="emit('togglePin')"
      />
      <UButton
        v-if="inInbox"
        icon="i-lucide-folder-input"
        label="File"
        aria-label="File note out of the inbox"
        color="neutral"
        variant="soft"
        class="min-h-11 lg:min-h-0"
        @click="emit('file')"
      />
    </div>
    <UInputTags
      :model-value="tags"
      placeholder="Add tags…"
      aria-label="Tags"
      variant="ghost"
      class="w-full"
      @update:model-value="emit('tags', $event)"
    />
  </header>
</template>
