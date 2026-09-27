<script setup lang="ts">
import type { Summary } from '#shared/schemas/summaries'

defineProps<{ summary: Summary | null | undefined, enabled: boolean, editing: boolean, saving: boolean }>()
const draft = defineModel<string>('draft', { required: true })
defineEmits<{ edit: [], save: [], cancel: [], reset: [], synopsis: [] }>()
</script>

<template>
  <section
    aria-labelledby="summary-heading"
    class="flex flex-col gap-2 border-t border-default pt-4"
  >
    <div class="flex flex-wrap items-center gap-2">
      <h2
        id="summary-heading"
        class="flex items-center gap-1.5 text-sm font-medium text-muted"
      >
        <UIcon
          name="i-lucide-sparkles"
          class="size-4 text-primary"
        />
        Summary
      </h2>
      <UBadge
        v-if="summary"
        :label="summary.isManual ? 'Written by you' : 'Automatic'"
        :color="summary.isManual ? 'neutral' : 'primary'"
        variant="subtle"
        size="sm"
      />
    </div>

    <form
      v-if="editing"
      class="flex flex-col gap-2"
      @submit.prevent="$emit('save')"
    >
      <UTextarea
        v-model="draft"
        :rows="3"
        autoresize
        autofocus
        aria-label="Summary"
        class="w-full"
      />
      <p class="text-xs text-muted">
        Your summary is kept as written: background updates will not replace it.
      </p>
      <div class="flex flex-wrap gap-2">
        <UButton
          type="submit"
          label="Save summary"
          :loading="saving"
          :disabled="!draft.trim()"
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

    <template v-else>
      <p
        v-if="summary"
        class="text-sm whitespace-pre-line text-default"
      >
        {{ summary.text }}
      </p>
      <p
        v-else
        class="text-sm text-muted"
      >
        <template v-if="enabled">
          No summary yet – it is written in the background shortly after you write.
        </template>
        <template v-else>
          Write one yourself, or turn on background summaries in
          <ULink
            to="/settings/ai"
            class="text-primary underline"
          >AI settings</ULink>.
        </template>
      </p>
      <div class="flex flex-wrap gap-1">
        <UButton
          :label="summary ? 'Edit' : 'Write summary'"
          icon="i-lucide-pencil"
          color="neutral"
          variant="ghost"
          size="sm"
          class="min-h-11"
          @click="$emit('edit')"
        />
        <UButton
          v-if="summary?.isManual"
          label="Reset to automatic"
          icon="i-lucide-rotate-ccw"
          color="neutral"
          variant="ghost"
          size="sm"
          class="min-h-11"
          :loading="saving"
          @click="$emit('reset')"
        />
        <UButton
          v-if="summary"
          label="Use as synopsis"
          icon="i-lucide-file-text"
          color="neutral"
          variant="ghost"
          size="sm"
          class="min-h-11"
          @click="$emit('synopsis')"
        />
      </div>
    </template>
  </section>
</template>
