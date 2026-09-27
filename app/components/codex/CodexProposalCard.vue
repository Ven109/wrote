<script setup lang="ts">
import type { CodexProposal } from '#shared/schemas/codex-proposals'

defineProps<{ proposal: CodexProposal, titleOf: (id: string) => string | undefined, busy: boolean, editing: boolean }>()
defineEmits<{ accept: [], reject: [], edit: [], cancel: [] }>()
</script>

<template>
  <li class="flex flex-col gap-2 rounded-lg p-3 ring ring-default">
    <div class="flex flex-wrap items-center gap-2">
      <UBadge
        :label="proposal.action === 'create' ? 'New' : 'Update'"
        :color="proposal.action === 'create' ? 'primary' : 'neutral'"
        variant="subtle"
        size="sm"
      />
      <span class="font-medium text-highlighted">{{ proposal.title }}</span>
      <span class="text-xs text-muted">{{ proposal.codexType }} · from {{ proposal.sourceTitle }} · {{ proposal.author.name }}</span>
    </div>
    <slot v-if="editing" />
    <template v-else>
      <p
        v-if="proposal.aliases.length"
        class="text-sm"
      >
        <span class="text-muted">{{ proposal.action === 'create' ? 'Also called' : 'New aliases' }}:</span> {{ proposal.aliases.join(', ') }}
      </p>
      <dl
        v-if="Object.keys(proposal.fields).length"
        class="grid grid-cols-[auto_1fr] gap-x-3 text-sm"
      >
        <template
          v-for="(value, key) in proposal.fields"
          :key="key"
        >
          <dt class="text-muted">
            {{ key }}
          </dt>
          <dd>{{ displayValue(value, titleOf) }}</dd>
        </template>
      </dl>
      <p
        v-if="proposal.description"
        class="text-sm"
      >
        {{ proposal.description }}
      </p>
    </template>
    <blockquote
      v-for="quote in proposal.evidence"
      :key="quote"
      class="border-s-2 border-accented ps-2 text-xs text-toned italic"
    >
      “{{ quote }}”
    </blockquote>
    <div class="flex flex-wrap gap-2">
      <UButton
        label="Accept"
        icon="i-lucide-check"
        size="sm"
        class="min-h-11"
        :loading="busy"
        :aria-label="`Accept ${proposal.title}`"
        @click="$emit('accept')"
      />
      <UButton
        v-if="!editing"
        label="Edit"
        icon="i-lucide-pencil"
        color="neutral"
        variant="soft"
        size="sm"
        class="min-h-11"
        :aria-label="`Edit ${proposal.title}`"
        @click="$emit('edit')"
      />
      <UButton
        v-else
        label="Cancel"
        color="neutral"
        variant="ghost"
        size="sm"
        class="min-h-11"
        @click="$emit('cancel')"
      />
      <UButton
        label="Reject"
        icon="i-lucide-x"
        color="neutral"
        variant="ghost"
        size="sm"
        class="min-h-11"
        :disabled="busy"
        :aria-label="`Reject ${proposal.title}`"
        @click="$emit('reject')"
      />
    </div>
  </li>
</template>
