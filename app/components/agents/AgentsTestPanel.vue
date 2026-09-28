<script setup lang="ts">
import type { AgentTestResult } from '~/composables/useAgentEditor'

/** "Test on scene": runs the agent as edited (unsaved changes included) and shows its findings; nothing is stored. */
defineProps<{ sceneItems: { label: string, value: string }[], testing: boolean, result: AgentTestResult | null }>()
const scene = defineModel<string | undefined>('scene')
defineEmits<{ run: [] }>()
const SEVERITY = { low: 'neutral', medium: 'warning', high: 'error' } as const
</script>

<template>
  <section
    aria-labelledby="agent-test-heading"
    class="flex flex-col gap-3 rounded-lg p-4 ring ring-default"
  >
    <h2
      id="agent-test-heading"
      class="font-medium text-highlighted"
    >
      Test on scene
    </h2>
    <div class="flex flex-wrap items-end gap-2">
      <UFormField
        label="Scene"
        class="min-w-0 flex-1"
      >
        <USelect
          v-model="scene"
          :items="sceneItems"
          class="w-full"
        />
      </UFormField>
      <UButton
        label="Run test"
        icon="i-lucide-play"
        class="min-h-11 lg:min-h-0"
        :loading="testing"
        :disabled="!scene"
        @click="$emit('run')"
      />
    </div>
    <div
      v-if="result"
      aria-live="polite"
      class="flex flex-col gap-2"
    >
      <p class="text-sm text-muted">
        {{ result.findings.length }} {{ result.findings.length === 1 ? 'finding' : 'findings' }} in “{{ result.scene }}” (not saved).
      </p>
      <p
        v-if="result.summary"
        class="text-sm italic"
      >
        {{ result.summary }}
      </p>
      <ul class="flex flex-col gap-2">
        <li
          v-for="(finding, index) in result.findings"
          :key="index"
          class="flex flex-col gap-1 rounded-md bg-elevated p-3 text-sm"
        >
          <UBadge
            :label="`${finding.severity} · ${finding.category}`"
            :color="SEVERITY[finding.severity]"
            variant="subtle"
            size="sm"
            class="self-start"
          />
          <blockquote class="border-s-2 border-warning ps-2 text-xs text-muted italic">
            {{ finding.quote }}
          </blockquote>
          <p>{{ finding.message }}</p>
          <p
            v-if="finding.suggestion"
            class="text-xs"
          >
            <span class="text-muted">Suggested:</span> {{ finding.suggestion }}
          </p>
        </li>
      </ul>
    </div>
  </section>
</template>
