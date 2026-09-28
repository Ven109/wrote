<script setup lang="ts">
const bookId = useRouteBookId()
const editor = useAgentEditor(bookId)
const { agents, problems, selected, current, draft, isNew, saving, testing, testScene, sceneItems, result } = editor
useSeoMeta({ title: 'Agents' })
</script>

<template>
  <BaseSplitView
    :detail-active="Boolean(selected || isNew)"
    list-label="Review agents"
  >
    <template #list>
      <AgentsList
        :agents="agents"
        :selected="selected"
        :problems="problems"
        @select="editor.edit"
        @create="editor.create"
      />
    </template>
    <div
      v-if="selected || isNew"
      class="mx-auto flex max-w-3xl flex-col gap-6 p-4 sm:p-6"
    >
      <div class="flex items-center gap-2">
        <UButton
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          aria-label="Back to agents"
          class="size-11 justify-center lg:hidden"
          @click="editor.close"
        />
        <h2 class="text-lg font-semibold text-highlighted">
          {{ isNew ? 'New agent' : current?.name }}
        </h2>
      </div>
      <template v-if="draft">
        <AgentsForm
          v-model="draft"
          :is-new="isNew"
          :saving="saving"
          @save="editor.save"
          @remove="editor.remove"
        />
        <AgentsTestPanel
          v-model:scene="testScene"
          :scene-items="sceneItems"
          :testing="testing"
          :result="result"
          @run="editor.test"
        />
      </template>
      <div
        v-else-if="current"
        class="flex flex-col gap-3"
      >
        <p class="text-muted">
          {{ current.description }}
        </p>
        <p class="whitespace-pre-line rounded-lg bg-elevated p-4 text-sm">
          {{ current.instructions }}
        </p>
        <p class="text-sm text-muted">
          Built-in agents cannot be edited. Customize makes a copy in <code>agents/{{ current.id }}.md</code> that replaces it for this book.
        </p>
        <UButton
          label="Customize"
          icon="i-lucide-copy"
          class="min-h-11 self-start lg:min-h-0"
          @click="editor.customize"
        />
      </div>
    </div>
    <BaseEmptyState
      v-else
      icon="i-lucide-bot"
      title="Pick an agent"
      description="Review agents check your scenes: run them from the Review menu in the editor, or with @agent in the assistant."
      class="hidden lg:flex"
    />
  </BaseSplitView>
</template>
