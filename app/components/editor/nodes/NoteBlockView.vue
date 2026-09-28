<script setup lang="ts">
import { NodeViewContent, NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import type { NoteTodo } from '~/editor/extensions/note-block'

/** An author note in the text: an aside with a TODO toggle (none → open → done). Left out of exports. */
const props = defineProps(nodeViewProps)
const todo = computed(() => props.node.attrs.todo as NoteTodo)
const NEXT: Record<string, NoteTodo> = { none: 'open', open: 'done', done: null }
const label = computed(() => (todo.value === 'open' ? 'Open task – mark done' : todo.value === 'done' ? 'Done – remove task' : 'Make this a task'))
</script>

<template>
  <NodeViewWrapper
    as="aside"
    data-type="note"
    :data-todo="todo ?? undefined"
    aria-label="Author note"
    class="my-4 rounded-md border-s-4 border-warning bg-warning/5 px-4 py-2 text-base not-prose"
  >
    <div
      contenteditable="false"
      class="mb-1 flex items-center gap-2 text-xs font-medium tracking-wide text-warning uppercase select-none"
    >
      <UIcon
        name="i-lucide-sticky-note"
        class="size-3.5"
      />
      Note
      <UButton
        :icon="todo === 'done' ? 'i-lucide-circle-check' : todo === 'open' ? 'i-lucide-circle' : 'i-lucide-list-todo'"
        :label="todo === 'open' ? 'To do' : todo === 'done' ? 'Done' : undefined"
        :aria-label="label"
        :title="label"
        size="xs"
        color="warning"
        variant="ghost"
        class="ms-auto min-h-11 lg:min-h-0"
        @click="updateAttributes({ todo: NEXT[todo ?? 'none'] })"
      />
    </div>
    <NodeViewContent
      class="text-muted"
      :class="todo === 'done' ? 'line-through' : ''"
    />
  </NodeViewWrapper>
</template>
