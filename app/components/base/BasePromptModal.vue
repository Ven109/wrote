<script setup lang="ts">
const props = withDefaults(defineProps<{
  title: string
  label?: string
  initialValue?: string
  submitLabel?: string
  placeholder?: string
}>(), { label: 'Name', initialValue: '', submitLabel: 'Save', placeholder: '' })

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ submit: [value: string] }>()

const value = ref(props.initialValue)
watch(open, (isOpen) => {
  if (isOpen) value.value = props.initialValue
})

function submit() {
  const trimmed = value.value.trim()
  if (!trimmed) return
  emit('submit', trimmed)
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="title"
  >
    <template #body>
      <form
        id="base-prompt-form"
        @submit.prevent="submit"
      >
        <UFormField :label="label">
          <UInput
            v-model="value"
            autofocus
            class="w-full"
            :placeholder="placeholder"
          />
        </UFormField>
      </form>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          label="Cancel"
          @click="open = false"
        />
        <UButton
          type="submit"
          form="base-prompt-form"
          :label="submitLabel"
          :disabled="!value.trim()"
        />
      </div>
    </template>
  </UModal>
</template>
