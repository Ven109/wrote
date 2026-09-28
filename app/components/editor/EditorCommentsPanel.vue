<script setup lang="ts">
import type { CommentView } from '#shared/schemas/comments'

/** Comments as a list in a slideover (phones and tablets, where there is no margin). */
defineProps<{ comments: CommentView[], active: string | null, busy: string | null }>()
defineEmits<{ reply: [id: string, body: string], resolve: [id: string], focus: [id: string], dismiss: [id: string], fix: [id: string] }>()
const open = defineModel<boolean>('open', { default: false })
</script>

<template>
  <USlideover
    v-model:open="open"
    title="Comments"
  >
    <template #body>
      <div class="flex flex-col gap-3">
        <EditorCommentCard
          v-for="comment in comments"
          :key="comment.id"
          :comment="comment"
          :active="active === comment.id"
          :busy="busy === comment.id"
          @reply="body => $emit('reply', comment.id, body)"
          @resolve="$emit('resolve', comment.id)"
          @focus="$emit('focus', comment.id)"
          @dismiss="$emit('dismiss', comment.id)"
          @fix="$emit('fix', comment.id)"
        />
        <BaseEmptyState
          v-if="!comments.length"
          icon="i-lucide-message-square"
          title="No open comments"
        />
      </div>
    </template>
  </USlideover>
</template>
