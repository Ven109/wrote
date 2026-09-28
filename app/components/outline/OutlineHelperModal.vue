<script setup lang="ts">
import type { OutlineHelperForm } from '~/composables/useOutlineHelpers'

type Item = { label: string, value: string }
const props = defineProps<{ beatItems: Item[], actItems: Item[], templateItems: Item[], running: boolean, canRun: boolean }>()
const open = defineModel<boolean>('open', { default: false })
const form = defineModel<OutlineHelperForm | null>('form', { required: true })
defineEmits<{ run: [] }>()

const title = computed(() => {
  if (form.value?.kind === 'bridge') return 'Suggest bridge beats'
  return form.value?.actId === HELPER_ALL ? 'Find plot holes' : 'What is missing in this act?'
})
const description = computed(() => (form.value?.kind === 'bridge'
  ? 'Alternative beats that get the story from one beat to the next. They appear as proposals after the first beat.'
  : 'Notes and missing beats appear as proposals on the outline. Nothing changes until you accept them.'))
const selectable = computed(() => props.beatItems.length > 0)
</script>

<template>
  <UModal
    v-model:open="open"
    :title="title"
    :description="description"
  >
    <template #body>
      <form
        v-if="form"
        id="outline-helper-form"
        class="space-y-4"
        @submit.prevent="canRun && $emit('run')"
      >
        <template v-if="form.kind === 'bridge'">
          <UFormField label="From">
            <USelect
              v-model="form.fromBeatId"
              :items="beatItems"
              :disabled="!selectable"
              class="w-full"
            />
          </UFormField>
          <UFormField label="To">
            <USelect
              v-model="form.toBeatId"
              :items="beatItems"
              :disabled="!selectable"
              class="w-full"
            />
          </UFormField>
        </template>
        <template v-else>
          <UFormField label="Look at">
            <USelect
              v-model="form.actId"
              :items="actItems"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Compare with"
            help="The beat sheet you follow, if any."
          >
            <USelect
              v-model="form.templateId"
              :items="templateItems"
              class="w-full"
            />
          </UFormField>
        </template>
      </form>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          label="Cancel"
          class="min-h-11 lg:min-h-0"
          @click="open = false"
        />
        <UButton
          type="submit"
          form="outline-helper-form"
          label="Suggest"
          icon="i-lucide-sparkles"
          class="min-h-11 lg:min-h-0"
          :loading="running"
          :disabled="!canRun"
        />
      </div>
    </template>
  </UModal>
</template>
