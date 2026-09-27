<script setup lang="ts">
import type { ChatThread } from '#shared/schemas/chat'

const props = defineProps<{ threads: ChatThread[], activeId: string | null }>()
const emit = defineEmits<{ open: [id: string], remove: [id: string], new: [] }>()
const items = computed(() => [
  [{ label: 'New chat', icon: 'i-lucide-plus', onSelect: () => emit('new') }],
  props.threads.map(thread => ({
    label: thread.title,
    icon: thread.id === props.activeId ? 'i-lucide-message-circle-more' : 'i-lucide-message-circle',
    onSelect: () => emit('open', thread.id),
  })),
  ...(props.activeId ? [[{ label: 'Delete this chat', icon: 'i-lucide-trash', color: 'error' as const, onSelect: () => emit('remove', props.activeId!) }]] : []),
])
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'end' }"
    :ui="{ content: 'max-w-72' }"
  >
    <UButton
      icon="i-lucide-history"
      color="neutral"
      variant="ghost"
      aria-label="Chats"
      class="size-11 justify-center lg:size-auto"
    />
  </UDropdownMenu>
</template>
