<script setup lang="ts">
import type { BudgetStatus } from '#shared/schemas/usage'
import { formatCost } from '~/utils/usage'

const props = defineProps<{ status: BudgetStatus, share: number | null }>()
const emit = defineEmits<{ save: [budget: number | null] }>()
const draft = ref<number | undefined>(props.status.budget ?? undefined)
watch(() => props.status.budget, (budget) => {
  draft.value = budget ?? undefined
})
const color = computed(() => (props.status.level === 100 ? 'error' : props.status.level === 80 ? 'warning' : 'primary'))
</script>

<template>
  <section
    class="flex flex-col gap-3 rounded-lg border border-default p-4"
    aria-labelledby="budget-heading"
  >
    <h2
      id="budget-heading"
      class="text-sm font-semibold text-highlighted"
    >
      Monthly budget
    </h2>
    <div v-if="share !== null">
      <UProgress
        :model-value="share"
        :color="color"
        :aria-label="`${share}% of the monthly budget spent`"
      />
      <p class="mt-1 text-xs text-muted">
        {{ formatCost(status.spent) }} of {{ formatCost(status.budget ?? 0) }} spent in {{ status.month }}
      </p>
    </div>
    <p
      v-else
      class="text-xs text-muted"
    >
      {{ formatCost(status.spent) }} spent in {{ status.month }}. Set a budget to be warned at 80% and 100%.
    </p>
    <form
      class="flex flex-wrap items-end gap-2"
      @submit.prevent="emit('save', draft && draft > 0 ? draft : null)"
    >
      <UFormField
        label="Budget (USD per month)"
        class="w-44"
      >
        <UInputNumber
          v-model="draft"
          :min="0"
          :step="5"
          :format-options="{ style: 'currency', currency: 'USD' }"
          class="w-full"
        />
      </UFormField>
      <UButton
        type="submit"
        label="Save"
        size="lg"
      />
      <UButton
        v-if="status.budget"
        label="Remove"
        color="neutral"
        variant="ghost"
        size="lg"
        @click="emit('save', null)"
      />
    </form>
  </section>
</template>
