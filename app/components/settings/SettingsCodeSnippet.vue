<script setup lang="ts">
defineProps<{ label: string, hint: string, code: string, copied?: boolean }>()
defineEmits<{ copy: [] }>()
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <div class="flex items-center justify-between gap-2">
      <p class="text-sm font-medium text-highlighted">
        {{ label }}
      </p>
      <UButton
        :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
        :label="copied ? 'Copied' : 'Copy'"
        color="neutral"
        variant="ghost"
        size="xs"
        :aria-label="`Copy ${label} configuration`"
        class="min-h-11 sm:min-h-0"
        @click="$emit('copy')"
      />
    </div>
    <p class="text-xs text-muted">
      {{ hint }}
    </p>
    <pre class="overflow-x-auto rounded-md border border-muted bg-muted p-3 text-xs"><code>{{ code }}</code></pre>
  </div>
</template>
