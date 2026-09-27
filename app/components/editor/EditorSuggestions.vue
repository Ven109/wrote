<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import { setSuggestions, SUGGESTION_ACTION_EVENT, type SuggestionActionDetail } from '~/editor/extensions/ai-suggestions'
import { SUGGESTIONS_CONTEXT } from '~/editor/suggestions-context'

/** Bridges the page's suggestions and the editor: feeds the inline decorations and forwards their controls. */
const props = defineProps<{ editor: Editor }>()
const context = inject(SUGGESTIONS_CONTEXT, null)
const onAction = (event: Event) => context?.onAction((event as CustomEvent<SuggestionActionDetail>).detail)

watch(() => context?.suggestions.value ?? [], (suggestions) => {
  props.editor.view.dispatch(setSuggestions(props.editor.state, suggestions))
}, { immediate: true })

onMounted(() => {
  context?.attach(props.editor)
  props.editor.view.dom.addEventListener(SUGGESTION_ACTION_EVENT, onAction)
})
onBeforeUnmount(() => {
  context?.attach(null)
  props.editor.view.dom.removeEventListener(SUGGESTION_ACTION_EVENT, onAction)
})
</script>

<template>
  <span hidden />
</template>
