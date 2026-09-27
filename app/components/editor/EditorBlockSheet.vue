<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{ items: DropdownMenuItem[][] }>()
const open = defineModel<boolean>('open', { default: false })
</script>

<template>
  <UDrawer
    v-model:open="open"
    title="Block"
    description="Change or move the block at the cursor."
    :ui="{ header: 'sr-only' }"
  >
    <template #body>
      <div class="flex flex-col gap-3 pb-[env(safe-area-inset-bottom)]">
        <ul
          v-for="(group, index) in items"
          :key="index"
          class="grid grid-cols-2 gap-1"
        >
          <template
            v-for="item in group"
            :key="item.label"
          >
            <li
              v-if="item.type === 'label'"
              class="col-span-2 px-2 pt-1 text-xs font-medium text-muted"
            >
              {{ item.label }}
            </li>
            <li v-else>
              <UButton
                :label="item.label"
                :icon="item.icon"
                :color="item.color ?? 'neutral'"
                :disabled="item.disabled"
                variant="ghost"
                block
                class="min-h-11 justify-start"
                @click="item.onSelect?.($event)"
              />
            </li>
          </template>
        </ul>
      </div>
    </template>
  </UDrawer>
</template>
