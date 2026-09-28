<script setup lang="ts">
import type { SnapshotScopeOption } from '~/composables/useSnapshots'

const props = defineProps<{ scopes: SnapshotScopeOption[] }>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ submit: [name: string, scope: string] }>()
const name = ref('')
const scope = ref('book')
watch(open, (isOpen) => {
  if (!isOpen) return
  name.value = `Snapshot ${new Date().toLocaleDateString()}`
  scope.value = props.scopes[0]?.value ?? 'book'
})

function submit() {
  if (!name.value.trim()) return
  emit('submit', name.value.trim(), scope.value)
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Take snapshot"
    description="A named copy you can compare with and restore later."
  >
    <template #body>
      <form
        class="flex flex-col gap-4"
        @submit.prevent="submit"
      >
        <UFormField label="Name">
          <UInput
            v-model="name"
            class="w-full"
            autofocus
          />
        </UFormField>
        <URadioGroup
          v-model="scope"
          legend="Of"
          :items="scopes.map(option => ({ label: option.label, value: option.value }))"
        />
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            size="lg"
            @click="open = false"
          />
          <UButton
            type="submit"
            label="Take snapshot"
            icon="i-lucide-camera"
            size="lg"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>
