<script setup lang="ts">
const props = defineProps<{ bookId: string }>()
const assistant = useAssistant(() => props.bookId)
const { messages, status, input, contextChips, threads, threadId, errorCode } = assistant
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div class="flex items-center justify-end gap-1 px-2 pb-1">
      <UButton
        icon="i-lucide-square-pen"
        color="neutral"
        variant="ghost"
        aria-label="New chat"
        class="size-11 justify-center lg:size-auto"
        @click="assistant.newThread"
      />
      <AssistantThreadMenu
        :threads="threads"
        :active-id="threadId"
        @open="assistant.open"
        @remove="assistant.remove"
        @new="assistant.newThread"
      />
    </div>
    <div class="min-h-0 flex-1 overflow-y-auto px-2">
      <BaseEmptyState
        v-if="!messages.length"
        icon="i-lucide-sparkles"
        title="Ask about your book"
        description="“Which scenes mention the harbor?” · “Summarize this scene” · “What does Mara want?”"
      />
      <UChatMessages
        v-else
        :messages="messages"
        :status="status"
        :assistant="{ icon: 'i-lucide-sparkles', variant: 'naked' }"
        :user="{ variant: 'soft' }"
        compact
      >
        <template #content="{ message }">
          <AssistantMessageParts
            :message="message"
            :book-id="bookId"
          />
        </template>
      </UChatMessages>
      <UAlert
        v-if="errorCode"
        :title="errorCode === 'ai_not_configured' ? 'No AI model configured' : 'The assistant ran into a problem'"
        :description="errorCode === 'ai_not_configured' ? 'Choose a chat model in AI models settings.' : assistant.error.value?.message"
        color="error"
        variant="subtle"
        class="mt-2"
      />
    </div>
    <UChatPrompt
      v-model="input"
      placeholder="Ask about your book…"
      :autofocus="false"
      :error="assistant.error.value ?? undefined"
      variant="subtle"
      class="m-2"
      @submit="assistant.send"
    >
      <template #header>
        <div
          v-if="contextChips.length"
          class="flex flex-wrap gap-1"
          aria-label="Context"
        >
          <UBadge
            v-for="chip in contextChips"
            :key="chip.label"
            :icon="chip.icon"
            :label="chip.label"
            color="neutral"
            variant="subtle"
            size="sm"
          />
        </div>
      </template>
      <UChatPromptSubmit
        :status="status"
        @stop="assistant.stop"
        @reload="assistant.regenerate"
      />
    </UChatPrompt>
  </div>
</template>
