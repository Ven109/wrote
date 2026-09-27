<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import { aiMenuItems } from '~/editor/ai-actions'
import { blockPosAtCursor } from '~/editor/block-actions'
import { INLINE_AI_CONTEXT, type InlineAiTarget } from '~/editor/inline-ai-context'

/** "✦ AI" dropdown: acts on the selection, or – without one – on the block at the cursor. */
const props = withDefaults(defineProps<{ editor: Editor, size?: 'sm' | 'md' | 'lg' }>(), { size: 'sm' })
const context = inject(INLINE_AI_CONTEXT, null)
function target(): InlineAiTarget {
  if (!props.editor.state.selection.empty) return { kind: 'selection' }
  return { kind: 'block', pos: blockPosAtCursor(props.editor) ?? 0 }
}
const items = computed(() => (context
  ? aiMenuItems((action, param) => context.run(props.editor, action, target(), param), () => context.ask(props.editor, target()))
  : []))
</script>

<template>
  <UDropdownMenu
    v-if="context"
    :items="items"
    :content="{ align: 'start' }"
    :ui="{ content: 'w-56' }"
  >
    <UButton
      icon="i-lucide-sparkles"
      label="AI"
      color="primary"
      variant="ghost"
      :size="size"
      aria-label="AI actions"
    />
  </UDropdownMenu>
</template>
