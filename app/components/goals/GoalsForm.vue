<script setup lang="ts">
const props = defineProps<{ target: number | null, deadline: string | null }>()
const emit = defineEmits<{ save: [target: number | null, deadline: string | null] }>()
const draftTarget = ref<number | string | undefined>(props.target ?? undefined)
const draftDeadline = ref(props.deadline ?? '')
watch(() => [props.target, props.deadline] as const, ([target, deadline]) => {
  draftTarget.value = target ?? undefined
  draftDeadline.value = deadline ?? ''
})

function submit() {
  const target = Math.round(Number(draftTarget.value))
  emit('save', target > 0 ? target : null, draftDeadline.value || null)
}
</script>

<template>
  <form
    class="flex flex-wrap items-end gap-3 rounded-lg border border-default p-4"
    aria-label="Writing goal"
    @submit.prevent="submit"
  >
    <UFormField
      label="Word target"
      class="w-40"
    >
      <UInput
        v-model="draftTarget"
        type="number"
        min="1"
        inputmode="numeric"
        aria-label="Word target"
        class="w-full"
      />
    </UFormField>
    <UFormField
      label="Deadline"
      class="w-44"
    >
      <UInput
        v-model="draftDeadline"
        type="date"
        aria-label="Deadline"
        class="w-full"
      />
    </UFormField>
    <UButton
      type="submit"
      label="Save goal"
      size="lg"
    />
    <UButton
      v-if="target || deadline"
      label="Remove"
      color="neutral"
      variant="ghost"
      size="lg"
      @click="emit('save', null, null)"
    />
  </form>
</template>
