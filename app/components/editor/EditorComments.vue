<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import { COMMENTS_CONTEXT } from '~/editor/comments-context'
import { COMMENT_FOCUS_EVENT, setCommentHighlights } from '~/editor/extensions/comment-highlights'

/** Bridges the page's comments and the editor: feeds the highlights and reports clicks on them. */
const props = defineProps<{ editor: Editor }>()
const context = inject(COMMENTS_CONTEXT, null)
const onFocus = (event: Event) => context?.focus((event as CustomEvent<string>).detail)

watch(() => [context?.comments.value ?? [], context?.active.value ?? null] as const, ([comments, active]) => {
  props.editor.view.dispatch(setCommentHighlights(props.editor.state, comments, active))
}, { immediate: true })

onMounted(() => {
  context?.attach(props.editor)
  props.editor.view.dom.addEventListener(COMMENT_FOCUS_EVENT, onFocus)
})
onBeforeUnmount(() => {
  context?.attach(null)
  props.editor.view.dom.removeEventListener(COMMENT_FOCUS_EVENT, onFocus)
})
</script>

<template>
  <span hidden />
</template>
