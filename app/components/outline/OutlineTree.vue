<script setup lang="ts">
import type { DropdownMenuItem, TreeItem } from '@nuxt/ui'
import type { Act, Beat, Outline } from '#shared/schemas/outline'

/** Acts → beats as a collapsible tree; the menus rename, add, reorder and delete. */
const props = defineProps<{
  outline: Outline
  actMenu: (act: Act) => DropdownMenuItem[][]
  beatMenu: (beat: Beat) => DropdownMenuItem[][]
}>()
defineEmits<{ open: [beat: Beat] }>()

type OutlineTreeItem = TreeItem & { act?: Act, beat?: Beat }
const items = computed<OutlineTreeItem[]>(() => props.outline.acts.map(act => ({
  label: act.title,
  act,
  defaultExpanded: true,
  children: act.beats.map(beat => ({ label: beat.title, beat, icon: beat.scenes.length ? 'i-lucide-file-text' : 'i-lucide-circle-dashed' })),
})))
</script>

<template>
  <UTree
    :items="items"
    :get-key="(item?: OutlineTreeItem) => item?.beat?.id ?? item?.act?.id ?? String(item?.label ?? '')"
    aria-label="Outline"
    @select="(_event, item) => (item as OutlineTreeItem).beat && $emit('open', (item as OutlineTreeItem).beat!)"
  >
    <template #item-trailing="{ item }">
      <BaseActionsMenu
        :items="(item as OutlineTreeItem).beat ? beatMenu((item as OutlineTreeItem).beat!) : actMenu((item as OutlineTreeItem).act!)"
        :label="String(item.label)"
      />
    </template>
  </UTree>
</template>
