<script setup lang="ts">
const open = defineModel<boolean>('open', { required: true })
const prompt = defineModel<string>('prompt', { required: true })
defineEmits<{ submit: [] }>()
</script>

<template>
  <UModal
    v-model:open="open"
    title="Ask AI"
    description="Tell the AI what to do with this passage. The result arrives as a suggestion you can accept or reject."
  >
    <template #body>
      <form
        class="flex flex-col gap-3"
        @submit.prevent="$emit('submit')"
      >
        <UTextarea
          v-model="prompt"
          autofocus
          autoresize
          :rows="2"
          placeholder="e.g. Make Mara more hesitant here"
          aria-label="Instruction for the AI"
          class="w-full"
        />
        <UButton
          type="submit"
          label="Suggest"
          icon="i-lucide-sparkles"
          :disabled="!prompt.trim()"
          class="min-h-11 self-end"
        />
      </form>
    </template>
  </UModal>
</template>
