<script setup lang="ts">
import type { SuggestionView } from '#shared/schemas/suggestion'
import { markdownToDisplay } from '~/editor/suggestion-anchor'

defineProps<{ suggestion: SuggestionView, editing: boolean, busy: boolean }>()
const draft = defineModel<string>('draft', { required: true })
defineEmits<{ accept: [], reject: [], edit: [], save: [], cancel: [], jump: [] }>()
</script>

<template>
  <li class="flex flex-col gap-2 rounded-lg border border-default p-3">
    <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
      <UIcon
        :name="suggestion.author.kind === 'mcp' ? 'i-lucide-plug' : 'i-lucide-sparkles'"
        class="size-4 text-primary"
      />
      <span class="font-medium text-default">{{ suggestion.author.name }}</span>
      <span>{{ suggestion.kind === 'insert' ? 'suggests adding' : 'suggests a change' }}</span>
      <UBadge
        v-if="suggestion.stale"
        label="Text changed"
        color="warning"
        variant="subtle"
        size="sm"
      />
    </div>
    <p class="text-sm">
      <del
        v-if="suggestion.kind === 'replace'"
        class="text-muted"
      >{{ markdownToDisplay(suggestion.find) }}</del>
      <span
        v-else
        class="text-muted"
      >After “{{ markdownToDisplay(suggestion.find) }}”:</span>
      {{ ' ' }}
      <ins class="rounded bg-primary/15 px-0.5 no-underline">{{ markdownToDisplay(suggestion.replace) }}</ins>
    </p>
    <p
      v-if="suggestion.rationale"
      class="text-xs text-muted"
    >
      {{ suggestion.rationale }}
    </p>
    <form
      v-if="editing"
      class="flex flex-col gap-2"
      @submit.prevent="$emit('save')"
    >
      <UTextarea
        v-model="draft"
        autoresize
        autofocus
        :rows="2"
        aria-label="Edit the proposed text"
      />
      <div class="flex gap-2">
        <UButton
          type="submit"
          label="Accept edited"
          :loading="busy"
          class="min-h-11"
        />
        <UButton
          label="Cancel"
          color="neutral"
          variant="ghost"
          class="min-h-11"
          @click="$emit('cancel')"
        />
      </div>
    </form>
    <div
      v-else
      class="flex flex-wrap gap-1"
    >
      <UButton
        label="Accept"
        icon="i-lucide-check"
        size="sm"
        class="min-h-11"
        :disabled="suggestion.stale || busy"
        @click="$emit('accept')"
      />
      <UButton
        label="Reject"
        icon="i-lucide-x"
        size="sm"
        color="neutral"
        variant="soft"
        class="min-h-11"
        :disabled="busy"
        @click="$emit('reject')"
      />
      <UButton
        label="Edit"
        icon="i-lucide-pencil"
        size="sm"
        color="neutral"
        variant="ghost"
        class="min-h-11"
        :disabled="suggestion.stale || busy"
        @click="$emit('edit')"
      />
      <UButton
        label="Show"
        icon="i-lucide-locate"
        size="sm"
        color="neutral"
        variant="ghost"
        class="min-h-11"
        :disabled="suggestion.stale"
        @click="$emit('jump')"
      />
    </div>
  </li>
</template>
