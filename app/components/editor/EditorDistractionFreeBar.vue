<script setup lang="ts">
/** The only chrome left in distraction-free mode: a faint exit button (for touch – Esc on keyboards) and a slot for the timer. */
defineEmits<{ exit: [] }>()
</script>

<template>
  <div
    class="fixed end-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 flex items-center gap-1 opacity-40 transition-opacity duration-200 hover:opacity-100 focus-within:opacity-100 motion-reduce:transition-none"
    data-testid="distraction-free-bar"
  >
    <slot />
    <UButton
      icon="i-lucide-minimize"
      color="neutral"
      variant="ghost"
      aria-label="Exit distraction-free mode"
      class="size-11 justify-center"
      @click="$emit('exit')"
    />
  </div>
</template>
