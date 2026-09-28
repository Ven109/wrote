<script setup lang="ts">
const props = defineProps<{ bookId: string }>()
const assistant = useAssistant(() => props.bookId)
const { messages, status, input, contextChips, threads, threadId, errorCode, overrides } = assistant
const drawer = useContextDrawer(() => props.bookId, assistant)
const mentions = useAgentMentions(() => props.bookId, input)
const root = ref<HTMLElement | null>(null)
/** Inserts `@agent ` and puts the cursor after it, so the author keeps typing the request. */
async function pickAgent(agentId: string) {
  mentions.pick(agentId)
  await nextTick()
  const textarea = root.value?.querySelector('textarea')
  textarea?.focus()
  textarea?.setSelectionRange(input.value.length, input.value.length)
}
</script>

<template>
  <div
    ref="root"
    class="flex h-full min-h-0 flex-col"
  >
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
            @context="drawer.show"
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
      placeholder="Ask about your book… (@ for review agents)"
      :autofocus="false"
      :error="assistant.error.value ?? undefined"
      variant="subtle"
      class="m-2"
      @submit="assistant.send"
    >
      <template #header>
        <div
          v-if="mentions.suggestions.value.length"
          class="flex flex-wrap gap-1"
          role="group"
          aria-label="Review agents"
        >
          <UButton
            v-for="agent in mentions.suggestions.value"
            :key="agent.id"
            :label="`@${agent.id}`"
            :title="agent.description"
            :aria-label="`Ask ${agent.name}`"
            icon="i-lucide-bot"
            color="neutral"
            variant="soft"
            size="xs"
            class="min-h-11 lg:min-h-0"
            @click="pickAgent(agent.id)"
          />
        </div>
        <div
          v-if="contextChips.length || mentions.active.value"
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
          <UBadge
            v-if="mentions.active.value"
            icon="i-lucide-bot"
            :label="`Answered by ${mentions.active.value.name}`"
            color="primary"
            variant="subtle"
            size="sm"
          />
          <UButton
            v-if="overrides.pinned.length || overrides.removed.length"
            :label="`${overrides.pinned.length} pinned · ${overrides.removed.length} left out`"
            icon="i-lucide-x"
            trailing
            color="primary"
            variant="subtle"
            size="xs"
            aria-label="Clear context changes"
            @click="assistant.clearOverrides"
          />
        </div>
      </template>
      <UChatPromptSubmit
        :status="status"
        @stop="assistant.stop"
        @reload="assistant.regenerate"
      />
    </UChatPrompt>
    <AssistantContextDrawer
      v-model:open="drawer.open.value"
      :snapshot="drawer.snapshot.value"
      :groups="drawer.groups.value"
      :omitted="drawer.omitted.value"
      :changed="drawer.changed.value"
      @pin="drawer.togglePin"
      @remove="drawer.toggleRemove"
      @rerun="drawer.rerun"
    />
  </div>
</template>
