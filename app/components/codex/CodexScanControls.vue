<script setup lang="ts">
const props = defineProps<{ bookId: string }>()
const { proposals, reviewOpen, busy, editing, draft, titleOf, accept, reject, edit, cancelEdit } = useCodexProposals(() => props.bookId)
const scan = useCodexScan(() => props.bookId, () => (reviewOpen.value = true))
const { open, targets, target, scanning, start } = scan
</script>

<template>
  <UButton
    icon="i-lucide-scan-search"
    :aria-label="scanning ? 'Scanning…' : 'Scan chapter for codex entries'"
    color="neutral"
    variant="ghost"
    class="size-11 justify-center lg:size-auto"
    :loading="scanning"
    @click="open = true"
  />
  <UButton
    v-if="proposals.length"
    :label="String(proposals.length)"
    icon="i-lucide-inbox"
    :aria-label="`Review ${proposals.length} codex proposals`"
    color="primary"
    variant="soft"
    size="sm"
    class="min-h-11 sm:min-h-0"
    @click="reviewOpen = true"
  />

  <UModal
    v-model:open="open"
    title="Scan chapter"
    description="Finds characters, places and other entries in a chapter and proposes them for your codex. Nothing is added until you accept it."
  >
    <template #body>
      <USelect
        v-model="target"
        :items="targets"
        placeholder="Choose a chapter"
        aria-label="Chapter to scan"
        class="w-full"
      />
    </template>
    <template #footer>
      <UButton
        label="Scan"
        icon="i-lucide-scan-search"
        :disabled="!target"
        @click="start"
      />
    </template>
  </UModal>

  <USlideover
    v-model:open="reviewOpen"
    title="Codex proposals"
    description="Accept, edit or reject each one."
  >
    <template #body>
      <ul
        class="flex flex-col gap-3"
        aria-label="Codex proposals"
      >
        <CodexProposalCard
          v-for="proposal in proposals"
          :key="proposal.id"
          :proposal="proposal"
          :title-of="titleOf"
          :busy="busy === proposal.id"
          :editing="editing === proposal.id"
          @accept="accept(proposal)"
          @reject="reject(proposal)"
          @edit="edit(proposal)"
          @cancel="cancelEdit"
        >
          <CodexProposalForm
            v-if="draft"
            v-model="draft"
            :with-description="proposal.action === 'create'"
          />
        </CodexProposalCard>
      </ul>
      <BaseEmptyState
        v-if="!proposals.length"
        icon="i-lucide-check-check"
        title="All reviewed"
      />
    </template>
  </USlideover>
</template>
