<script setup lang="ts">
const { open, text, saving, targetTitle, submit, onKeydown } = useQuickCapture()
useQuickCaptureShortcut()
</script>

<template>
  <UModal
    v-model:open="open"
    title="Quick capture"
    :description="targetTitle ? `Saved to the inbox of “${targetTitle}”` : 'Saved to your inbox'"
  >
    <template #body>
      <UTextarea
        v-model="text"
        autofocus
        autoresize
        :rows="4"
        :maxrows="12"
        placeholder="First line becomes the title…"
        aria-label="Note text"
        class="w-full"
        @keydown="onKeydown"
      />
    </template>
    <template #footer>
      <div class="flex w-full items-center justify-between gap-2">
        <span class="hidden text-xs text-muted sm:inline">
          <UKbd value="enter" /> save · <UKbd value="shift" /><UKbd value="enter" /> new line · <UKbd value="escape" /> cancel
        </span>
        <UButton
          label="Save to inbox"
          icon="i-lucide-inbox"
          :loading="saving"
          :disabled="!text.trim()"
          class="min-h-11 sm:min-h-0"
          @click="submit"
        />
      </div>
    </template>
  </UModal>
</template>
