<script setup lang="ts">
import type { ManuscriptTreeItem } from '~/composables/useManuscriptTreeView'

const props = defineProps<{
  bookId: string
  activePath: string | null
}>()

const view = useManuscriptTreeView(() => props.bookId, () => props.activePath)
const { items, activeNode, dragEnabled, dragDrop, dialog, dialogOpen } = view
const { dropTarget } = dragDrop

function dragAttrs(item: ManuscriptTreeItem) {
  return dragEnabled.value ? dragDrop.handlers(item.node) : {}
}

function dropPositionFor(item: ManuscriptTreeItem) {
  return dropTarget.value?.id === item.node.id ? dropTarget.value.position : null
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <div class="flex items-center justify-between px-1">
      <span class="text-xs font-medium text-muted uppercase">Manuscript</span>
      <UButton
        icon="i-lucide-plus"
        color="neutral"
        variant="ghost"
        size="xs"
        aria-label="New part"
        class="size-8 justify-center lg:size-6"
        @click="view.newPart"
      />
    </div>

    <UTree
      :items="items"
      :get-key="(item?: ManuscriptTreeItem) => item?.node?.id ?? String(item?.label ?? '')"
      size="sm"
      aria-label="Manuscript"
    >
      <template #item-label="{ item }">
        <ManuscriptNodeLabel
          :node="item.node"
          :active="activeNode?.id === item.node.id"
          :drop-position="dropPositionFor(item)"
          v-bind="dragAttrs(item)"
        />
      </template>
      <template #item-trailing="{ item }">
        <span class="group/node flex items-center gap-1">
          <span class="hidden text-xs text-dimmed tabular-nums sm:inline">{{ item.node.wordCount }}</span>
          <ManuscriptNodeMenu
            :items="view.menuFor(item.node)"
            :label="item.node.title"
          />
        </span>
      </template>
    </UTree>

    <BasePromptModal
      :open="dialogOpen && (dialog?.kind === 'create' || dialog?.kind === 'rename')"
      :title="view.promptTitle.value"
      label="Title"
      :initial-value="dialog?.kind === 'rename' ? dialog.node.title : ''"
      :submit-label="dialog?.kind === 'rename' ? 'Rename' : 'Create'"
      @update:open="dialogOpen = $event"
      @submit="view.submitPrompt"
    />
    <BaseConfirmModal
      :open="dialogOpen && dialog?.kind === 'delete'"
      :title="`Delete “${dialog?.kind === 'delete' ? dialog.node.title : ''}”?`"
      description="It is moved to the book's trash (.wrote/trash) together with everything inside it."
      confirm-label="Delete"
      danger
      @update:open="dialogOpen = $event"
      @confirm="view.confirmDelete"
    />
  </div>
</template>
