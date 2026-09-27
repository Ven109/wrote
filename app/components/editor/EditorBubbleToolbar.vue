<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import { FORMAT_ITEMS } from '~/editor/menus'

defineProps<{ editor: Editor }>()
const items = [FORMAT_ITEMS, [{ slot: 'ai' as const }]]
</script>

<template>
  <UEditorToolbar
    :editor="editor"
    :items="items"
    layout="bubble"
    class="rounded-md border border-default bg-default p-0.5 shadow-lg"
  >
    <template #ai>
      <EditorAiMenu :editor="editor" />
    </template>
  </UEditorToolbar>
</template>
