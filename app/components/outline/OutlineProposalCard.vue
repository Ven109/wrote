<script setup lang="ts">
import type { OutlineProposal } from '#shared/schemas/outline-proposals'

/** A ghost card: a proposed beat, edit or note that changes nothing until the author accepts it. */
const props = defineProps<{ proposal: OutlineProposal, targetTitle?: string, busy: boolean }>()
defineEmits<{ accept: [], reject: [] }>()

const content = computed(() => {
  const { change } = props.proposal
  if (change.kind === 'addBeat') return { badge: 'Proposed beat', title: change.title, text: change.summary }
  if (change.kind === 'note') return { badge: 'Note', title: '', text: change.text }
  return { badge: 'Suggested edit', title: change.title ?? props.targetTitle ?? '', text: change.summary ?? '' }
})
const name = computed(() => content.value.title || content.value.text.slice(0, 60))
</script>

<template>
  <li
    class="flex flex-col gap-2 rounded-lg border border-dashed border-primary/60 bg-primary/5 p-3"
    :aria-label="`${content.badge}: ${name}`"
  >
    <div class="flex flex-wrap items-center gap-2">
      <UBadge
        :label="content.badge"
        color="primary"
        variant="subtle"
        size="sm"
      />
      <span
        v-if="proposal.change.kind === 'updateBeat' && targetTitle"
        class="text-xs text-muted"
      >to “{{ targetTitle }}”</span>
    </div>
    <p
      v-if="content.title"
      class="font-medium text-highlighted"
    >
      {{ content.title }}
    </p>
    <p
      v-if="content.text"
      class="line-clamp-4 text-sm text-muted"
    >
      {{ content.text }}
    </p>
    <p
      v-if="proposal.rationale"
      class="text-sm italic text-toned"
    >
      {{ proposal.rationale }}
    </p>
    <p class="text-xs text-dimmed">
      {{ [proposal.source, proposal.author.name].filter(Boolean).join(' · ') }}
    </p>
    <div class="flex gap-2">
      <UButton
        label="Accept"
        icon="i-lucide-check"
        size="sm"
        class="min-h-11 lg:min-h-0"
        :loading="busy"
        :aria-label="`Accept ${content.badge.toLowerCase()}: ${name}`"
        @click="$emit('accept')"
      />
      <UButton
        label="Reject"
        icon="i-lucide-x"
        size="sm"
        color="neutral"
        variant="ghost"
        class="min-h-11 lg:min-h-0"
        :disabled="busy"
        :aria-label="`Reject ${content.badge.toLowerCase()}: ${name}`"
        @click="$emit('reject')"
      />
    </div>
  </li>
</template>
