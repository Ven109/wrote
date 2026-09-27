<script setup lang="ts">
import type { UIMessage } from 'ai'
import type { AssistantMessageMetadata } from '#shared/schemas/chat'
import { renderMarkdown } from '~/utils/markdown-html'
import { describeToolPart, isToolPart } from '~/utils/tool-parts'

const props = defineProps<{ message: UIMessage, bookId: string }>()
defineEmits<{ context: [snapshotId: string] }>()
const snapshotId = computed(() => (props.message.metadata as AssistantMessageMetadata | undefined)?.contextSnapshotId)
</script>

<template>
  <div class="flex flex-col gap-2">
    <template
      v-for="(part, index) in message.parts"
      :key="`${message.id}-${index}`"
    >
      <!-- Model output is untrusted: rendered through Markdown + DOMPurify only. -->
      <!-- eslint-disable vue/no-v-html -- sanitized by renderMarkdown (DOMPurify) -->
      <div
        v-if="part.type === 'text' && message.role === 'assistant'"
        class="prose-chat text-sm/6"
        v-html="renderMarkdown(part.text)"
      />
      <!-- eslint-enable vue/no-v-html -->
      <p
        v-else-if="part.type === 'text'"
        class="text-sm/6 whitespace-pre-wrap"
      >
        {{ part.text }}
      </p>
      <AssistantToolCall
        v-else-if="isToolPart(part)"
        :call="describeToolPart(bookId, part)"
      />
    </template>
    <UButton
      v-if="message.role === 'assistant' && snapshotId"
      label="Context"
      icon="i-lucide-layers"
      color="neutral"
      variant="ghost"
      size="xs"
      class="min-h-11 self-start"
      aria-label="Show the context sent with this answer"
      @click="$emit('context', snapshotId)"
    />
  </div>
</template>
