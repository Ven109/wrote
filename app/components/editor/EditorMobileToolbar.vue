<script setup lang="ts">
import type { EditorHandlers } from '@nuxt/ui'
import type { Editor } from '@tiptap/vue-3'
import { MOBILE_TOOLBAR_ITEMS } from '~/editor/menus'

const props = defineProps<{ editor: Editor, handlers: EditorHandlers }>()
const { open, items, openAtCursor } = useBlockMenu(() => props.editor, () => props.handlers)
const { inset } = useKeyboardInset()
</script>

<template>
  <div
    class="fixed inset-x-0 z-40 border-t border-default bg-default/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    :style="{ bottom: `${inset}px` }"
    data-testid="editor-mobile-toolbar"
  >
    <div class="flex items-center gap-1 overflow-x-auto px-2 py-1">
      <UEditorToolbar
        :editor="editor"
        :items="MOBILE_TOOLBAR_ITEMS"
        layout="fixed"
        size="lg"
        class="min-w-0 flex-1"
      />
      <EditorAiMenu
        :editor="editor"
        size="lg"
        class="shrink-0"
      />
      <UButton
        icon="i-lucide-ellipsis"
        color="neutral"
        variant="ghost"
        size="lg"
        aria-label="Block actions"
        class="shrink-0"
        @click="openAtCursor"
      />
    </div>
    <EditorBlockSheet
      v-model:open="open"
      :items="items"
    />
  </div>
</template>
