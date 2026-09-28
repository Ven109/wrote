<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import { setSuggestions, SUGGESTION_ACTION_EVENT, type SuggestionActionDetail } from '~/editor/extensions/ai-suggestions'
import { SUGGESTIONS_CONTEXT } from '~/editor/suggestions-context'

/** Bridges the page's suggestions and the editor: feeds the inline decorations and forwards their controls. */
const props = defineProps<{ editor: Editor }>()
const context = inject(SUGGESTIONS_CONTEXT, null)
const bridge = useEditorBridge(() => props.editor)
bridge.listen(SUGGESTION_ACTION_EVENT, event => context?.onAction((event as CustomEvent<SuggestionActionDetail>).detail))

watch(() => context?.suggestions.value ?? [], (suggestions) => {
  bridge.dispatch(state => setSuggestions(state, suggestions))
}, { immediate: true })

onMounted(() => context?.attach(props.editor))
onBeforeUnmount(() => context?.attach(null))
</script>

<template>
  <span hidden />
</template>
