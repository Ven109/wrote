<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import { COMMENTS_CONTEXT } from '~/editor/comments-context'
import { COMMENT_FOCUS_EVENT, setCommentHighlights } from '~/editor/extensions/comment-highlights'

/** Bridges the page's comments and the editor: feeds the highlights and reports clicks on them. */
const props = defineProps<{ editor: Editor }>()
const context = inject(COMMENTS_CONTEXT, null)
const bridge = useEditorBridge(() => props.editor)
bridge.listen(COMMENT_FOCUS_EVENT, event => context?.focus((event as CustomEvent<string>).detail))

watch(() => [context?.comments.value ?? [], context?.active.value ?? null] as const, ([comments, active]) => {
  bridge.dispatch(state => setCommentHighlights(state, comments, active))
}, { immediate: true })

onMounted(() => context?.attach(props.editor))
onBeforeUnmount(() => context?.attach(null))
</script>

<template>
  <span hidden />
</template>
