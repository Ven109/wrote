<script setup lang="ts">
const props = defineProps<{ bookId: string }>()
const approvals = useApprovals(() => props.bookId)
const { cards, blocking, deciding } = approvals
</script>

<template>
  <div
    v-if="cards.length"
    class="fixed inset-x-4 bottom-4 z-50 flex flex-col gap-2 sm:inset-x-auto sm:start-4 sm:w-96"
    role="region"
    aria-label="Requests waiting for your approval"
  >
    <UCard
      v-for="approval in cards"
      :key="approval.id"
      class="shadow-lg"
      :ui="{ body: 'p-3 sm:p-3' }"
    >
      <AppApprovalCard
        :approval="approval"
        :busy="deciding === approval.id"
        @approve="approvals.approve(approval)"
        @deny="approvals.deny(approval)"
      />
    </UCard>
  </div>
  <UModal
    v-if="blocking"
    :open="true"
    :dismissible="false"
    title="Approve a destructive change?"
    description="This cannot be undone from Wrote. Check what the agent wants to do."
  >
    <template #body>
      <AppApprovalCard
        :approval="blocking"
        :busy="deciding === blocking.id"
        @approve="approvals.approve(blocking)"
        @deny="approvals.deny(blocking)"
      />
    </template>
  </UModal>
</template>
