<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import { FORMAT_ITEMS } from '~/editor/menus'

defineProps<{ editor: Editor }>()
</script>

<template>
  <UEditorToolbar
    :editor="editor"
    :items="FORMAT_ITEMS"
    layout="bubble"
    class="rounded-md border border-default bg-default p-0.5 shadow-lg"
  />
</template>
