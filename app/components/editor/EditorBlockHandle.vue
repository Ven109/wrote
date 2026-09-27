<script setup lang="ts">
import type { EditorHandlers } from '@nuxt/ui'
import type { Editor } from '@tiptap/vue-3'

const props = defineProps<{ editor: Editor, handlers: EditorHandlers }>()
const { open, items, openFor } = useBlockMenu(() => props.editor, () => props.handlers)

function onOpenChange(value: boolean) {
  open.value = value
  props.editor.commands.setMeta('lockDragHandle', value)
}
</script>

<template>
  <UEditorDragHandle
    v-slot="{ ui, onClick }"
    :editor="editor"
  >
    <UDropdownMenu
      :open="open"
      :items="items"
      :modal="false"
      :content="{ side: 'left', align: 'start' }"
      :ui="{ content: 'w-52' }"
      @update:open="onOpenChange"
    >
      <UButton
        icon="i-lucide-grip-vertical"
        color="neutral"
        variant="ghost"
        size="sm"
        aria-label="Block actions"
        :class="ui.handle()"
        @click="openFor(onClick()?.pos ?? null)"
      />
    </UDropdownMenu>
  </UEditorDragHandle>
</template>
