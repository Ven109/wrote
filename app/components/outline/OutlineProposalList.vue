<script setup lang="ts">
import type { OutlineProposal } from '#shared/schemas/outline-proposals'

/** Proposals listed above the outline: notes, ones whose act or beat is gone, and (tree view) all of them. */
defineProps<{ proposals: OutlineProposal[], beatTitle: (beatId: string) => string | undefined, busy: string | null }>()
defineEmits<{ accept: [proposal: OutlineProposal], reject: [proposal: OutlineProposal] }>()
</script>

<template>
  <section
    v-if="proposals.length"
    aria-labelledby="outline-proposals-heading"
    class="space-y-2"
  >
    <h2
      id="outline-proposals-heading"
      class="text-sm font-medium text-muted"
    >
      Proposals ({{ proposals.length }})
    </h2>
    <ul class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      <OutlineProposalCard
        v-for="proposal in proposals"
        :key="proposal.id"
        :proposal="proposal"
        :target-title="proposal.change.kind === 'updateBeat' ? beatTitle(proposal.change.beatId) : undefined"
        :busy="busy === proposal.id"
        @accept="$emit('accept', proposal)"
        @reject="$emit('reject', proposal)"
      />
    </ul>
  </section>
</template>
