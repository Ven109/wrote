<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import { setFocusMode } from '~/editor/extensions/focus-mode'
import { setTypewriter } from '~/editor/extensions/typewriter'
import { WRITING_MODES_CONTEXT } from '~/editor/writing-modes-context'

/** Feeds the page's focus and typewriter modes into the editor (decorations and scrolling only). */
const props = defineProps<{ editor: Editor }>()
const context = inject(WRITING_MODES_CONTEXT, null)
watch(() => ({ enabled: context?.focus.value ?? false, scope: context?.focusScope.value ?? 'paragraph' as const }), (settings) => {
  props.editor.view.dispatch(setFocusMode(props.editor.state, settings))
}, { immediate: true })
watch(() => context?.typewriter.value ?? false, (enabled) => {
  props.editor.view.dispatch(setTypewriter(props.editor.state, enabled))
}, { immediate: true })
</script>

<template>
  <span hidden />
</template>
