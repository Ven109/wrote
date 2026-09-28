<script setup lang="ts">
import type { CommentView } from '#shared/schemas/comments'

const props = defineProps<{ comment: CommentView, active: boolean, busy: boolean }>()
const emit = defineEmits<{ reply: [body: string], resolve: [], focus: [], dismiss: [], fix: [] }>()
const SEVERITY_COLORS = { low: 'neutral', medium: 'warning', high: 'error' } as const
const review = computed(() => props.comment.review)
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
        v-if="review"
        :label="`${review.severity} · ${review.category}`"
        :color="SEVERITY_COLORS[review.severity]"
        variant="subtle"
        size="sm"
      />
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
    <p
      v-if="review?.suggestion"
      class="rounded bg-elevated px-2 py-1 text-xs"
    >
      <span class="text-muted">Suggested:</span> {{ review.suggestion }}
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
    <div class="flex flex-wrap gap-1.5">
      <UButton
        v-if="review?.suggestion && !review.suggestionId && !comment.detached"
        label="Apply fix"
        icon="i-lucide-wand-sparkles"
        variant="soft"
        size="sm"
        class="min-h-11 sm:min-h-0"
        :disabled="busy"
        :aria-label="`Apply fix from ${comment.author.name}`"
        @click.stop="emit('fix')"
      />
      <UButton
        label="Resolve"
        icon="i-lucide-check"
        color="neutral"
        variant="soft"
        size="sm"
        class="min-h-11 sm:min-h-0"
        :loading="busy"
        :aria-label="`Resolve comment by ${comment.author.name}`"
        @click.stop="emit('resolve')"
      />
      <UButton
        v-if="review"
        label="Dismiss"
        icon="i-lucide-x"
        color="neutral"
        variant="ghost"
        size="sm"
        class="min-h-11 sm:min-h-0"
        :disabled="busy"
        :aria-label="`Dismiss finding from ${comment.author.name}`"
        @click.stop="emit('dismiss')"
      />
    </div>
  </article>
</template>
