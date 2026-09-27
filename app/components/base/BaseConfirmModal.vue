<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  description?: string
  confirmLabel?: string
  danger?: boolean
}>(), { confirmLabel: 'Confirm', danger: false })

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ confirm: [] }>()

function confirm() {
  emit('confirm')
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="title"
    :description="description"
  >
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          label="Cancel"
          @click="open = false"
        />
        <UButton
          :color="danger ? 'error' : 'primary'"
          :label="confirmLabel"
          @click="confirm"
        />
      </div>
    </template>
  </UModal>
</template>
