<script setup lang="ts">
defineProps<{ label: string, preview: string }>()
defineEmits<{ stop: [] }>()
</script>

<template>
  <div
    class="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-md flex-col gap-2 rounded-lg border border-default bg-default p-3 shadow-lg lg:bottom-6"
    role="status"
    aria-live="polite"
  >
    <div class="flex items-center gap-2">
      <UIcon
        name="i-lucide-sparkles"
        class="size-4 animate-pulse text-primary motion-reduce:animate-none"
      />
      <span class="min-w-0 flex-1 truncate text-sm font-medium">{{ label }}…</span>
      <UButton
        label="Stop"
        icon="i-lucide-square"
        color="neutral"
        variant="ghost"
        size="sm"
        class="min-h-11"
        @click="$emit('stop')"
      />
    </div>
    <p
      v-if="preview"
      class="line-clamp-4 text-sm whitespace-pre-line text-muted"
    >
      {{ preview }}
    </p>
  </div>
</template>
