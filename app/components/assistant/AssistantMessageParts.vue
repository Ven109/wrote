<script setup lang="ts">
import type { UIMessage } from 'ai'
import { renderMarkdown } from '~/utils/markdown-html'
import { describeToolPart, isToolPart } from '~/utils/tool-parts'

defineProps<{ message: UIMessage, bookId: string }>()
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
  </div>
</template>
