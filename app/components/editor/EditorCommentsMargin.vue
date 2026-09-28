<script setup lang="ts">
import type { CommentView } from '#shared/schemas/comments'

/** Comment cards in the margin, each level with its passage (desktop). */
defineProps<{ comments: CommentView[], active: string | null, busy: string | null }>()
defineEmits<{ reply: [id: string, body: string], resolve: [id: string], focus: [id: string] }>()
const root = ref<HTMLElement | null>(null)
const { tops, observe } = useCommentLayout(root)
</script>

<template>
  <aside
    ref="root"
    aria-label="Comments"
    class="relative"
  >
    <div
      v-for="comment in comments"
      :key="comment.id"
      :ref="observe"
      :data-comment-id="comment.id"
      class="absolute inset-x-0 transition-[top] motion-reduce:transition-none"
      :style="{ top: `${tops[comment.id] ?? 0}px` }"
    >
      <EditorCommentCard
        :comment="comment"
        :active="active === comment.id"
        :busy="busy === comment.id"
        @reply="body => $emit('reply', comment.id, body)"
        @resolve="$emit('resolve', comment.id)"
        @focus="$emit('focus', comment.id)"
      />
    </div>
  </aside>
</template>
