<script setup lang="ts">
import type { CommentView } from '#shared/schemas/comments'

defineProps<{ comment: CommentView, active: boolean, busy: boolean }>()
const emit = defineEmits<{ reply: [body: string], resolve: [], focus: [] }>()
const draft = ref('')
function send() {
  if (!draft.value.trim()) return
  emit('reply', draft.value.trim())
  draft.value = ''
}
</script>

<template>
  <article
    :data-comment-id="comment.id"
    :aria-label="`Comment by ${comment.author.name}`"
    class="flex flex-col gap-2 rounded-lg bg-default p-3 text-sm ring transition-shadow"
    :class="active ? 'ring-2 ring-warning shadow-md' : 'ring-default'"
    @click="emit('focus')"
  >
    <header class="flex items-center gap-1.5">
      <UIcon
        :name="comment.author.kind === 'user' ? 'i-lucide-user' : 'i-lucide-bot'"
        class="size-4 text-muted"
      />
      <span class="font-medium text-highlighted">{{ comment.author.name }}</span>
      <UBadge
        v-if="comment.detached"
        label="Passage changed"
        color="neutral"
        variant="subtle"
        size="sm"
      />
    </header>
    <blockquote class="line-clamp-2 border-s-2 border-warning ps-2 text-xs text-muted italic">
      {{ comment.quote }}
    </blockquote>
    <p class="whitespace-pre-line">
      {{ comment.body }}
    </p>
    <div
      v-for="reply in comment.replies"
      :key="reply.id"
      class="border-t border-default pt-2"
    >
      <span class="font-medium text-highlighted">{{ reply.author.name }}:</span> {{ reply.body }}
    </div>
    <UInput
      v-model="draft"
      size="sm"
      placeholder="Reply…"
      :aria-label="`Reply to ${comment.author.name}`"
      :disabled="busy"
      @keydown.enter.prevent="send"
      @click.stop
    />
    <UButton
      label="Resolve"
      icon="i-lucide-check"
      color="neutral"
      variant="soft"
      size="sm"
      class="min-h-11 self-start sm:min-h-0"
      :loading="busy"
      :aria-label="`Resolve comment by ${comment.author.name}`"
      @click.stop="emit('resolve')"
    />
  </article>
</template>
